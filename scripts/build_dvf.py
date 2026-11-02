"""Construit site/data/prix-dvf.json à partir des Demandes de valeurs foncières (DVF).

Source : DGFiP, fichiers « DVF géolocalisées » publiés sur data.gouv.fr (Licence Ouverte 2.0).
Calcule, par commune et par type de bien, le nombre de ventes et les quartiles du prix au m²
sur les 36 derniers mois disponibles. Aucune donnée individuelle n'est publiée sur le site.

Lancé automatiquement par .github/workflows/dvf.yml (une fois par mois).
Usage local : python scripts/build_dvf.py
"""
import io
import json
import sys
import urllib.error
import urllib.request
from datetime import date

import pandas as pd

DEPARTEMENTS = ["69", "38", "01"]  # Rhône / Métropole, Isère, Ain
URL = "https://files.data.gouv.fr/geo-dvf/latest/csv/{an}/departements/{dep}.csv.gz"
FENETRE_MOIS = 36
MIN_VENTES = 5
COLS = [
    "id_mutation", "date_mutation", "nature_mutation", "valeur_fonciere",
    "code_commune", "nom_commune", "type_local", "surface_reelle_bati", "surface_terrain",
]


def telecharger(an: int, dep: str):
    url = URL.format(an=an, dep=dep)
    try:
        with urllib.request.urlopen(url, timeout=120) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    print(f"  {an} / {dep} : {len(data) / 1e6:.1f} Mo", file=sys.stderr)
    return pd.read_csv(io.BytesIO(data), compression="gzip", usecols=COLS,
                       dtype={"code_commune": str, "id_mutation": str}, low_memory=False)


def charger() -> pd.DataFrame:
    frames = []
    for an in range(date.today().year, date.today().year - 7, -1):
        for dep in DEPARTEMENTS:
            df = telecharger(an, dep)
            if df is not None:
                frames.append(df)
    if not frames:
        sys.exit("Aucun fichier DVF téléchargé.")
    df = pd.concat(frames, ignore_index=True)
    df["date_mutation"] = pd.to_datetime(df["date_mutation"])
    fin = df["date_mutation"].max()
    debut = fin - pd.DateOffset(months=FENETRE_MOIS)
    return df[df["date_mutation"] > debut], debut.date(), fin.date()


def prix_bati(df: pd.DataFrame) -> pd.DataFrame:
    """Ventes d'un seul logement (maison ou appartement), hors dépendances."""
    v = df[df["nature_mutation"] == "Vente"]
    locaux = v[v["type_local"].isin(["Maison", "Appartement"])]
    nb = locaux.groupby("id_mutation")["type_local"].transform("size")
    autres = v[v["type_local"].isin(["Local industriel. commercial ou assimilé"])]["id_mutation"].unique()
    u = locaux[(nb == 1) & ~locaux["id_mutation"].isin(autres)].copy()
    u = u[u["surface_reelle_bati"] >= 15]
    u["prix_m2"] = u["valeur_fonciere"] / u["surface_reelle_bati"]
    u = u[(u["prix_m2"] >= 500) & (u["prix_m2"] <= 20000)]
    u["type"] = u["type_local"].map({"Maison": "maison", "Appartement": "appartement"})
    return u[["code_commune", "nom_commune", "type", "prix_m2"]]


def prix_terrain(df: pd.DataFrame) -> pd.DataFrame:
    """Ventes de terrains à bâtir : valeur / surface totale des parcelles de la mutation."""
    t = df[df["nature_mutation"] == "Vente terrain à bâtir"]
    g = t.groupby("id_mutation").agg(
        valeur=("valeur_fonciere", "first"),
        surface=("surface_terrain", "sum"),
        code_commune=("code_commune", "first"),
        nom_commune=("nom_commune", "first"),
    )
    g = g[g["surface"] >= 100]
    g["prix_m2"] = g["valeur"] / g["surface"]
    g = g[(g["prix_m2"] >= 20) & (g["prix_m2"] <= 2000)]
    g["type"] = "terrain"
    return g.reset_index()[["code_commune", "nom_commune", "type", "prix_m2"]]


def arrondi(x: float) -> int:
    return int(round(x / 10.0) * 10)


def main():
    df, debut, fin = charger()
    ventes = pd.concat([prix_bati(df), prix_terrain(df)], ignore_index=True)
    out = {}
    for (code, typ), grp in ventes.groupby(["code_commune", "type"]):
        if len(grp) < MIN_VENTES:
            continue
        q = grp["prix_m2"].quantile([0.25, 0.5, 0.75])
        c = out.setdefault(code, {"nom": str(grp["nom_commune"].iloc[0])})
        c[typ] = {"n": int(len(grp)), "p25": arrondi(q[0.25]), "p50": arrondi(q[0.5]), "p75": arrondi(q[0.75])}
    res = {
        "meta": {
            "source": "DGFiP – Demandes de valeurs foncières (DVF), data.gouv.fr, Licence Ouverte 2.0",
            "debut": str(debut),
            "fin": str(fin),
            "maj": str(date.today()),
            "demo": False,
        },
        "communes": dict(sorted(out.items())),
    }
    with open("site/data/prix-dvf.json", "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(out)} communes écrites ({debut} → {fin}).", file=sys.stderr)


if __name__ == "__main__":
    main()
