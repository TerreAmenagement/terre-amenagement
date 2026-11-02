# Site Terre Aménagement

Site vitrine statique de Terre Aménagement (SAS INITIUM), publié sur Cloudflare Pages (projet `terre-amenagement`, domaine www.terre-amenagement.fr).

- `site/` : le site publié (HTML, CSS, polices, icônes, données de prix).
- `scripts/build_dvf.py` : calcule `site/data/prix-dvf.json` à partir des données publiques DVF (DGFiP, Licence Ouverte).
- `.github/workflows/deploy.yml` : publie le site à chaque modification, et recalcule les prix le 3 de chaque mois.

## Secrets GitHub nécessaires (Settings → Secrets and variables → Actions)

- `CLOUDFLARE_API_TOKEN` : jeton Cloudflare avec la permission « Compte → Cloudflare Pages → Modifier ».
- `CLOUDFLARE_ACCOUNT_ID` : identifiant du compte Cloudflare.

La section « Repères de prix » reste masquée tant que `prix-dvf.json` contient les données d'exemple. Premier calcul : onglet Actions → « Publication du site » → Run workflow.
