"""Génère marche/besoins.csv à partir des offres Wavestone (offres_wavestone/W*.json).
Chaque citation est vérifiée comme sous-chaîne exacte du texte de l'offre."""
import csv, json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "offres_wavestone"
OUT = ROOT / "marche" / "besoins.csv"

# id: (seniorite, citation_seniorite, [(competence, citation)], remarque)
B = {
"W01": ("jeune diplômé", "Jeune diplômé·e d’une grande école d’ingénieurs ou de commerce", [
  ("SQL", "en vous appuyant sur SQL et Power BI (indispensable)"),
  ("Power BI", "en vous appuyant sur SQL et Power BI (indispensable)"),
  ("Entrepôts cloud (BigQuery, Databricks, Snowflake)", "selon les missions, GCP BigQuery, Databricks ou Snowflake"),
  ("dbt / outils de dataviz (Tableau, Looker)", "La maîtrise de dbt et/ou d’autres outils de dataviz (Tableau, Looker…) constituera un véritable atout"),
  ("Définition de KPIs", "la définition d’indicateurs de performance pertinents"),
 ], "Titre 'AI Analytics & Data Visualization' mais le corps décrit des 'Analytics Engineers'. La section Qualifications est identique à W13 (copier-coller) : compétences extraites de la description."),
"W02": ("senior", "Vous avez 4 ans d’expérience ou plus dans le conseil", [
  ("Stratégie IA & Data / feuille de route", "Définir des stratégies IA & Data : diagnostic, feuille de route, business cases et priorisation des cas d’usage"),
  ("Operating model / transformation des organisations", "Transformer les métiers et les organisations : processus, Operating Models, rôles et modes de fonctionnement."),
  ("Gouvernance Data & IA, Responsible AI, AI Act", "Construire et opérationnaliser la gouvernance Data & IA : valeur, risques, Responsible AI et AI Act."),
  ("Conduite du changement / adoption de l'IA", "Accélérer l’adoption de l’IA et accompagner les collaborateurs dans l’évolution de leurs métiers"),
  ("Pilotage de projet multi-parties prenantes", "Vous savez structurer une problématique complexe et piloter un projet impliquant de multiples parties prenantes."),
 ], "Profil non technique revendiqué."),
"W03": ("manager", "6 ans d’expérience ou plus en architecture Data, Cloud ou IA.", [
  ("Architecture Data / Cloud / IA", "6 ans d’expérience ou plus en architecture Data, Cloud ou IA."),
  ("Design authority / revues d'architecture", "Vous intervenez comme design authority sur des programmes Data & IA."),
  ("Hyperscaler + plateformes Data & IA", "Maîtrise d’au moins un hyperscaler et connaissance des principales plateformes Data & IA."),
  ("Gouvernance, sécurité, résilience, FinOps", "Expérience des sujets gouvernance, sécurité, résilience, FinOps et operating model."),
  ("Build vs buy / sourcing", "Conduire les analyses build vs buy et les arbitrages cloud, plateforme et sourcing."),
  ("Cloud hybride / souverain", "Concevoir une trajectoire hybride ou souveraine."),
 ], ""),
"W04": ("senior", "5 ans d’expérience ou plus en architecture Data/Platform ou Data Engineering senior.", [
  ("Databricks", "Expérience concrète de Databricks sur un programme significatif."),
  ("Lakehouse : Spark, Delta Lake, Unity Catalog", "Maîtrise Lakehouse, Spark, Delta Lake et Unity Catalog."),
  ("Hyperscaler Azure / AWS / GCP (réseau, IAM)", "Bonne maîtrise d’au moins un hyperscaler parmi Azure, AWS ou GCP, y compris réseau, IAM et services managés."),
  ("Lakeflow, MLflow / Mosaic AI", "Compréhension de Lakeflow, MLflow/Mosaic AI et des patterns d’industrialisation Data & AI."),
  ("Gouvernance, sécurité, FinOps, operating model de plateforme", "Capacité à arbitrer architecture, gouvernance, sécurité, coûts et operating model avec des décideurs."),
 ], "Poste ouvert Senior Consultant OU Manager."),
"W05": ("senior", "4 ans d’expérience ou plus en Data Engineering, avec expérience significative GCP.", [
  ("Data Engineering sur GCP", "4 ans d’expérience ou plus en Data Engineering, avec expérience significative GCP."),
  ("BigQuery, SQL, Python", "Maîtrise de BigQuery, SQL, Python, Terraform et CI/CD."),
  ("Terraform / CI/CD", "Maîtrise de BigQuery, SQL, Python, Terraform et CI/CD."),
  ("Services Data GCP (Pub/Sub, Dataflow, Dataproc, Composer, Dataform)", "Expérience de plusieurs services Data GCP : GCS, Pub/Sub, Dataflow, Dataproc, Composer, Dataform ou équivalents."),
  ("IAM / FinOps GCP", "Connaissance des principaux services Data GCP, IAM et FinOps."),
  ("Lead technique", "Capacité à tenir un rôle de lead technique, organiser les revues et expliquer les arbitrages."),
 ], "Poste ouvert Senior Consultant OU Manager."),
"W06": ("manager", "5 ans d’expérience ou plus en Data/AI Engineering.", [
  ("Data / AI Engineering", "5 ans d’expérience ou plus en Data/AI Engineering."),
  ("Pilotage d'équipe engineering et delivery", "Expérience de pilotage d’équipe et de delivery."),
  ("Cloud, IaC, CI/CD, tests, observabilité", "Pratique du cloud, de l’infrastructure as code, du CI/CD, des tests et de l’observabilité."),
  ("Architectures data modernes, data products, APIs", "Maîtrise des architectures Data modernes, data products, APIs et patterns d’intégration."),
  ("Orchestrateur + cloud AWS / Azure / GCP", "Expérience d’un orchestrateur et d’un environnement cloud parmi AWS, Azure ou GCP."),
  ("Revues de code et qualité", "Prendre en charge les revues de code et de qualité"),
 ], ""),
"W07": ("manager", "Vous justifiez d'une expérience significative dans le développement de partenariats stratégiques", [
  ("Partenariats stratégiques / alliances éditeurs", "Vous justifiez d'une expérience significative dans le développement de partenariats stratégiques, l'animation d'écosystèmes technologiques ou le business development dans les domaines Data, Cloud et IA."),
  ("Écosystème Google Cloud, Data et IA", "Faire monter en compétence les consultants Wavestone sur les offres Google Cloud, Data et IA."),
  ("Avant-vente / appels d'offres", "Accompagner les équipes commerciales dans les opportunités et appels d'offres stratégiques impliquant Google."),
  ("Animation d'écosystème / événements", "Organiser et animer des événements, communautés et initiatives conjointes avec Google."),
  ("Conseil en stratégie Data & IA", "Accompagner les Directions Générales, Directions Data, DSI et Directions Métiers dans leurs stratégies Data & IA."),
 ], "Pas de nombre d'années indiqué. Rôle hybride alliance / business development / conseil."),
"W08": ("senior", "4 ans d’expérience ou plus en MLOps, plateforme ML ou engineering cloud.", [
  ("MLOps / plateforme ML", "4 ans d’expérience ou plus en MLOps, plateforme ML ou engineering cloud."),
  ("Cycle de vie ML/LLM, CI/CD, observabilité, sécurité", "Maîtrise du cycle de vie ML/LLM, CI/CD, observabilité et sécurité."),
  ("Registres de modèles, pipelines de déploiement", "Expérience des plateformes ML/LLM, registres, pipelines de déploiement et solutions d’observabilité."),
  ("SLO, FinOps IA, gateways LLM", "Compréhension des SLO, du FinOps IA, des gateways et de la sécurité des modèles."),
  ("Évaluation et monitoring de modèles", "installer les pratiques d’évaluation, monitoring et gestion des incidents"),
 ], "Poste ouvert Senior Consultant OU Manager."),
"W09": ("manager", "5 ans d’expérience ou plus en automation, low-code ou solutions digitales.", [
  ("Automatisation / low-code", "5 ans d’expérience ou plus en automation, low-code ou solutions digitales."),
  ("Copilot Studio, Power Platform, n8n", "Connaissance de Copilot Studio, Power Platform, n8n ou équivalents."),
  ("Arbitrage pro-code / low-code", "Arbitrer pro-code, low-code et solutions du marché."),
  ("Sécurité / IAM / API des agents", "Compréhension des enjeux API, IAM, données, sécurité et exploitation associés aux agents."),
  ("Transformation de processus / product ownership", "Expérience de transformation de processus, de product ownership ou de plateformes d’automatisation."),
  ("Gouvernance de portefeuille d'agents", "Gouverner un portefeuille Copilot Studio ou n8n."),
 ], ""),
"W10": ("senior", "4 ans d’expérience ou plus en AI Engineering.", [
  ("Python", "Python, RAG, agents, APIs, CI/CD et cloud."),
  ("RAG", "Maîtrise d’un framework d’orchestration et des patterns RAG, agents et tool calling."),
  ("Agents / tool calling / multi-agents", "Maîtrise d’un framework d’orchestration et des patterns RAG, agents et tool calling."),
  ("Évaluation, observabilité, sécurité GenAI", "Pratique de l’évaluation, de l’observabilité et des enjeux de sécurité GenAI."),
  ("APIs, CI/CD, cloud", "Python, RAG, agents, APIs, CI/CD et cloud."),
  ("Mise en production", "Expérience de mise en production"),
 ], ""),
"W11": ("senior", "4 ans d’expérience ou plus en AI ou software engineering.", [
  ("Solution GenAI / agentique en production", "Expérience d’une solution GenAI ou agentique en production."),
  ("Python, APIs, RAG, agents", "Crédibilité technique sur Python, APIs, RAG, agents, CI/CD et cloud."),
  ("Frameworks d'orchestration (LangGraph/LangChain, Google ADK, Semantic Kernel, LlamaIndex)", "Maîtrise d’au moins un framework d’orchestration : LangGraph/LangChain, Google ADK, Semantic Kernel, LlamaIndex ou équivalent."),
  ("Git, tests, CI/CD, conteneurs", "Pratique des APIs, de Git, des tests et des chaînes CI/CD ; compréhension du cloud et des conteneurs."),
  ("Dialogue métier / cadrage de la valeur", "Capacité à dialoguer avec un métier, challenger un besoin et décider dans un environnement mouvant."),
  ("Passage POC → produit", "Transformer un POC GenAI en produit critique."),
 ], "Poste ouvert Senior Consultant OU Manager. Intitulé 'Forward Deployed' = rôle terrain au contact client."),
"W12": ("manager", "Vous avez 6 ans d’expérience ou plus, principalement dans le conseil", [
  ("Stratégie IA & Data / feuille de route", "Définir leur stratégie IA & Data : ambitions, feuilles de route, business cases et priorisation des cas d’usage"),
  ("Target Operating Model", "Transformer les métiers et les organisations : processus, Target Operating Models, rôles et modèles de delivery."),
  ("Gouvernance Data & IA, Responsible AI, AI Act", "Structurer la gouvernance Data & IA : pilotage de la valeur, maîtrise des coûts et des risques, Responsible AI et AI Act."),
  ("Conduite du changement / adoption de l'IA", "Accélérer l’adoption et accompagner les impacts humains et organisationnels liés à l’IA."),
  ("Business cases / priorisation de cas d'usage GenAI et agentiques", "business cases et priorisation des cas d’usage, de la GenAI à l’IA agentique"),
 ], "Version manager de W02."),
"W13": ("jeune diplômé", "Jeune diplômé·e d’une grande école d’ingénieurs ou de commerce", [
  ("Feuille de route Data / IA", "le cadrage de feuilles de route Data/IA"),
  ("Operating models", "la structuration des organisations et modèles opérationnels"),
  ("Gestion de projet / product owner Data & IA", "le pilotage de projets Data, Analytics, IA, GenAI et Agentic AI (rôle de chef de projet, product owner ou product manager selon les contextes)"),
  ("BI / Analytics", "la valorisation des données via la BI et l’Analytics"),
  ("Gouvernance des données / acculturation", "gouvernance des données, plateformes technologiques, outils, acculturation et formation des équipes"),
 ], ""),
"W14": ("senior", "Vous avez 4 ans d'expérience ou plus en Data Engineering", [
  ("Data Engineering + pilotage d'équipe DE", "Vous avez 4 ans d'expérience ou plus en Data Engineering et avez piloter avec succès des équipes de Data Engineers."),
  ("Lakehouse, medallion, data mesh, data products", "data lake / data warehouse / lakehouse, approche medallion (bronze / silver / gold), data products et patterns de data mesh"),
  ("Databricks, Snowflake, Dataiku, Palantir Foundry, Fabric", "Databricks, Snowflake, Dataiku, Palantir Foundry, Fabric"),
  ("Infra-as-code (Terraform) et conteneurs (Docker, Kubernetes)", "Terraform, CloudFormation, Bicep…) et de conteneurisation (Docker, éventuellement Kubernetes)"),
  ("MLOps / LLMOps", "Vous avez une bonne connaissance des pratiques de MLOps et une culture et premières expériences concrètes en LLMOps."),
  ("Composants GenAI (RAG, vector DB, observabilité LLM)", "pipelines RAG, vector DB, outils d’observabilité des LLM, gestion des prompts"),
 ], "ATTENTION : titre 'Data Scientist' mais le contenu décrit un Tech Lead Data Engineering / plateforme. Compétences extraites du contenu, pas du titre."),
"W15": ("senior", "3 ans d’expérience ou plus en Data Engineering.", [
  ("Data Engineering", "3 ans d’expérience ou plus en Data Engineering."),
  ("SQL, Python", "SQL, Python, cloud, orchestration et CI/CD."),
  ("Cloud + orchestration", "SQL, Python, cloud, orchestration et CI/CD."),
  ("Tests, CI/CD, observabilité", "Sécuriser tests, CI/CD, observabilité et documentation."),
  ("Pipelines et data products cloud", "Construire des pipelines et data products cloud."),
 ], "Offre courte, peu de technologies nommées."),
"W16": ("manager", "Vous justifiez d’une expérience professionnelle d'au moins 6 ans de Data Scientist.", [
  ("Machine learning, deep learning, IA générative", "Concevoir, développer et déployer des modèles de machine learning, deep learning et IA générative"),
  ("Python + frameworks (TensorFlow, Scikit-Learn, Spark, PyTorch, Hugging Face)", "Vous maitrisez plusieurs Frameworks (TensorFLow, Scikit-Learn, Spark, PyTorch, Hugging Face Models) et langages de Data Science (Python, etc.)"),
  ("Plateformes Data & AI (Databricks, Fabric, Vertex, SageMaker, Snowflake)", "(Databricks, Microsoft Fabric, GCP Vertex, AWS Sagemaker, Snowflakes, etc.)"),
  ("MLOps", "Vous maitriser les enjeux du MLOps et les solutions et frameworks."),
  ("Évaluation et monitoring de modèles en production", "Mettre en œuvre des méthodologies d’évaluation, de monitoring et d’amélioration continue des modèles en production."),
  ("Encadrement de data scientists", "Encadrer des équipes de data scientists et développeurs"),
 ], ""),
"W17": ("confirmé", "1 à 3 ans d’expérience en CDI en conseil, data, IA ou environnement technologique exigeant.", [
  ("Architecture de plateforme Data & AI (cloud / hybride)", "Participer à la conception des architectures de plateforme Data & AI cloud, hybrides ou on-premises"),
  ("Data lake / warehouse / lakehouse + ETL/ELT", "data lakes, data warehouses, lakehouse) et des pipelines d’intégration (ETL/ELT)"),
  ("Streaming / architectures événementielles", "Mettre en place des architectures orientées événement (streaming)"),
  ("Fondamentaux infra : réseau, API, conteneurs, IaC", "Infrastructure bas niveau, réseau, protocole d’échange, API, conteneurisation, infra as code"),
  ("Solutions du marché (Dataiku, Databricks, Snowflake)", "pure players du marché (Dataiku, Databricks, Snowflakes, etc.)"),
  ("Orchestration / supervision des flux", "Intégrer des outils modernes pour orchestrer, superviser et optimiser les flux de données."),
 ], ""),
"W18": ("confirmé", "1 à 3 ans d’expérience en CDI en conseil, data, IA ou environnement technologique exigeant.", [
  ("Machine learning (fondamentaux)", "Bonne compréhension des concepts fondamentaux de l’IA et du machine learning."),
  ("Modèles ML, deep learning, IA générative", "Concevoir, développer et déployer des modèles de machine learning, deep learning et IA générative"),
  ("Cas d'usage : prédiction, NLP, computer vision, LLM", "prédiction, classification, NLP, computer vision, LLM, automatisation, optimisation"),
  ("Mise en production de modèles", "de l’identification des besoins métier à la mise en production des solutions"),
  ("Valeur métier des cas d'usage IA", "Capacité à challenger la valeur métier des cas d’usage IA."),
 ], ""),
"W19": ("jeune diplômé", "Jeune diplômé·e d’une grande école d’ingénieurs ou de commerce", [
  ("Python", "Bases en Python et développement logiciel ou data"),
  ("Data Lake / Lakehouse", "Notions d’architectures Data Lake / Lakehouse"),
  ("Cloud Azure / AWS / GCP", "Sensibilisation aux environnements cloud : Azure, AWS ou GCP"),
  ("Pipelines data batch / streaming", "Première approche des pipelines data (batch ou streaming)"),
  ("Plateformes GenAI : RAG, vector DB, MLOps/LLMOps", "Intérêt pour les plateformes IA et GenAI (vector DB, RAG, MLOps / LLMOps)"),
  ("Spark, Kafka, Airflow", "Première expérience avec Spark, Kafka, Airflow ou outils similaires"),
 ], ""),
"W20": ("jeune diplômé", "Jeune diplômé·e d’une grande école d’ingénieurs ou de commerce", [
  ("Python", "Bonne maîtrise de Python"),
  ("Machine learning et statistiques", "Connaissances en Machine Learning et statistiques"),
  ("Machine learning / deep learning", "Développer des modèles de Machine Learning et Deep Learning"),
  ("Applications LLM", "Concevoir et déployer des applications basées sur les LLMs (GPT, Claude, Mistral, etc.)"),
  ("RAG et agents IA", "Développer des solutions de Retrieval-Augmented Generation (RAG) et des agents IA"),
  ("MLOps / LLMOps", "Contribuer au développement de plateformes MLOps et LLMOps"),
 ], ""),
"W21": ("jeune diplômé", "Jeune diplômé·e d’une grande école d’ingénieurs ou de commerce", [
  ("LLM, embeddings, RAG", "Participer à la conception et au déploiement de solutions GenAI (LLM, embeddings, pipelines RAG)"),
  ("Systèmes multi-agents / MCP", "Contribuer à la création et à l’orchestration de systèmes multi‑agents (workflows, orchestrateurs, MCP)"),
  ("Agents IA en Python ou low/no-code", "Développer des agents IA (copilotes, assistants, automatisation de tâches) en Python ou via des solutions low/no‑code"),
  ("LangChain, LangGraph, Semantic Kernel", "LangChain, LangGraph, Semantic Kernel"),
  ("Cloud Azure / AWS / GCP", "plateformes GenAI sur des environnements cloud (Azure, AWS, GCP)"),
  ("LLMOps (CI/CD, monitoring, observabilité)", "MLOps, LLMOps, MCPOps (CI/CD, monitoring, observabilité, sécurité)"),
 ], "Section Qualifications identique à W19 (copier-coller) : compétences extraites des responsabilités."),
"W22": ("jeune diplômé", "Jeune diplômé·e d’une grande école d’ingénieurs ou de commerce", [
  ("Python / data engineering", "Bases en Python, développement ou data engineering"),
  ("Modèles ML / LLM (RAG, fine-tuning, embeddings)", "Concevoir, entraîner et évaluer des modèles ML / LLM (RAG, fine-tuning, embeddings)"),
  ("Pipelines data et agents IA (APIs)", "Développer des pipelines data et des agents IA (Python, APIs, orchestrations)"),
  ("Architectures data (Data Lake, Lakehouse)", "Connaissance des architectures data (Data Lake, Lakehouse, pipelines)"),
  ("Cloud Azure / AWS / GCP", "Sensibilisation aux environnements cloud : Azure, AWS ou GCP"),
  ("DevOps / CI-CD", "Notions de DevOps / CI-CD"),
 ], ""),
}

def norm(t: str) -> str:
    t = unicodedata.normalize("NFC", t).replace("\u00a0", " ").replace("\u202f", " ")
    return re.sub(r"[ \t]+", " ", t)


def main():
    errors = []
    rows = []
    for wid, (sen, sen_cit, comps, rem) in B.items():
        d = json.loads((SRC / f"{wid}.json").read_text())
        text = norm((SRC / f"{wid}.txt").read_text())
        assert 3 <= len(comps) <= 6, wid
        for c in [sen_cit] + [q for _, q in comps]:
            if norm(c) not in text:
                errors.append(f"{wid}: citation introuvable: {c!r}")
        row = {"id": wid, "titre_wavestone": d["name"].strip(), "url": d.get("postingUrl", ""),
               "date_publication": d["releasedDate"][:10], "seniorite": sen, "citation_seniorite": sen_cit}
        for i in range(6):
            c, q = comps[i] if i < len(comps) else ("", "")
            row[f"competence_{i+1}"] = c
            row[f"citation_{i+1}"] = q
        row["remarque"] = rem
        rows.append(row)
    if errors:
        print("\n".join(errors)); sys.exit(1)
    OUT.parent.mkdir(exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"{len(rows)} besoins écrits dans {OUT}")

if __name__ == "__main__":
    main()
