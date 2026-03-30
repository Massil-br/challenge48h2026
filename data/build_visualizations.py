"""
ParkShare Challenge 48h - Visualisations
Produit les graphiques et la carte dans data/output/
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
import os
import warnings
warnings.filterwarnings('ignore')

OUTPUT = "output"
os.makedirs(OUTPUT, exist_ok=True)

plt.rcParams.update({
    'figure.figsize': (14, 8),
    'font.size': 12,
    'axes.titlesize': 14,
    'axes.labelsize': 12,
})

# Charger les données
df = pd.read_csv(f"{OUTPUT}/kpis_par_commune.csv", dtype={"code_insee": str, "dep_code": str})
print(f"Données chargées : {len(df)} communes scorées")


# =============================================================================
# 1. BAR CHART - TOP 20 COMMUNES PAR SCORE
# =============================================================================
print("\n1/6 - Bar chart Top 20 communes")

top20 = df.nlargest(20, "score_potentiel").copy()
top20["label"] = top20["nom_standard"] + " (" + top20["dep_code"] + ")"
top20 = top20.sort_values("score_potentiel")

fig, ax = plt.subplots(figsize=(14, 10))
colors = plt.cm.RdYlGn(top20["score_potentiel"] / top20["score_potentiel"].max())
bars = ax.barh(top20["label"], top20["score_potentiel"], color=colors)

for bar, val in zip(bars, top20["score_potentiel"]):
    ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
            f'{val:.1f}', va='center', fontsize=10, fontweight='bold')

ax.set_xlabel("Score de potentiel")
ax.set_title("Top 20 communes - Score de potentiel ParkShare", fontsize=16, fontweight='bold')
ax.set_xlim(0, top20["score_potentiel"].max() * 1.15)
plt.tight_layout()
plt.savefig(f"{OUTPUT}/top20_score.png", dpi=150, bbox_inches='tight')
plt.close()
print("  -> top20_score.png")


# =============================================================================
# 2. SCATTER PLOT - Motorisation vs Densité de copropriétés
# =============================================================================
print("2/6 - Scatter plot motorisation vs densité copro")

df_scatter = df[
    (df["taux_motorisation"].notna()) &
    (df["copro_par_km2"].notna()) &
    (df["copro_par_km2"] > 0)
].copy()

# Limiter les outliers pour la lisibilité
df_scatter = df_scatter[df_scatter["copro_par_km2"] < df_scatter["copro_par_km2"].quantile(0.99)]

fig, ax = plt.subplots(figsize=(14, 10))
scatter = ax.scatter(
    df_scatter["taux_motorisation"],
    df_scatter["copro_par_km2"],
    c=df_scatter["score_potentiel"],
    cmap="RdYlGn",
    s=df_scatter["population"].clip(upper=200000) / 2000 + 5,
    alpha=0.6,
    edgecolors='gray', linewidth=0.3
)
cbar = plt.colorbar(scatter, ax=ax, label="Score de potentiel")

# Annoter les top 10
top10 = df_scatter.nlargest(10, "score_potentiel")
for _, row in top10.iterrows():
    ax.annotate(
        row["nom_standard"],
        (row["taux_motorisation"], row["copro_par_km2"]),
        fontsize=8, fontweight='bold',
        xytext=(5, 5), textcoords='offset points',
        bbox=dict(boxstyle='round,pad=0.2', facecolor='yellow', alpha=0.7)
    )

ax.set_xlabel("Taux de motorisation (%)")
ax.set_ylabel("Densité de copropriétés (copro/km²)")
ax.set_title("Motorisation vs Densité de copropriétés\n(taille = population, couleur = score)", fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig(f"{OUTPUT}/scatter_motorisation_copro.png", dpi=150, bbox_inches='tight')
plt.close()
print("  -> scatter_motorisation_copro.png")


# =============================================================================
# 3. HEATMAP CORRÉLATION
# =============================================================================
print("3/6 - Heatmap de corrélation")

corr_cols = [
    "population", "densite", "taux_motorisation", "part_collectif",
    "part_menages_avec_garage", "taux_voiture_sans_garage",
    "revenu_median", "nb_coproprietes", "total_lots_stationnement",
    "part_copro_avec_parking", "copro_par_km2", "lots_parking_pour_1000_hab",
    "nb_ventes_dependances", "score_potentiel"
]

corr_labels = [
    "Population", "Densité pop.", "Motorisation", "Part collectif",
    "Part avec garage", "Sans garage (%)", "Revenu médian",
    "Nb copropriétés", "Lots stationnement", "Copro avec parking (%)",
    "Copro/km²", "Lots park./1000hab", "Ventes dépendances", "SCORE"
]

df_corr = df[corr_cols].dropna()
corr_matrix = df_corr.corr()

fig, ax = plt.subplots(figsize=(16, 14))
mask = np.triu(np.ones_like(corr_matrix, dtype=bool), k=1)
sns.heatmap(
    corr_matrix,
    mask=mask,
    annot=True, fmt=".2f",
    cmap="RdBu_r", center=0, vmin=-1, vmax=1,
    xticklabels=corr_labels,
    yticklabels=corr_labels,
    square=True,
    linewidths=0.5,
    ax=ax
)
ax.set_title("Matrice de corrélation des indicateurs ParkShare", fontsize=16, fontweight='bold')
plt.tight_layout()
plt.savefig(f"{OUTPUT}/heatmap_correlation.png", dpi=150, bbox_inches='tight')
plt.close()
print("  -> heatmap_correlation.png")


# =============================================================================
# 4. DISTRIBUTION DU SCORE
# =============================================================================
print("4/6 - Distribution du score de potentiel")

fig, axes = plt.subplots(1, 2, figsize=(16, 7))

# Histogramme
axes[0].hist(df["score_potentiel"], bins=50, color='steelblue', edgecolor='white', alpha=0.8)
axes[0].axvline(df["score_potentiel"].median(), color='red', linestyle='--', label=f'Médiane: {df["score_potentiel"].median():.1f}')
axes[0].axvline(df["score_potentiel"].mean(), color='orange', linestyle='--', label=f'Moyenne: {df["score_potentiel"].mean():.1f}')
axes[0].set_xlabel("Score de potentiel")
axes[0].set_ylabel("Nombre de communes")
axes[0].set_title("Distribution du score de potentiel")
axes[0].legend()

# Box plot par grille densité
df_box = df[df["grille_densite_texte"].notna()].copy()
order = df_box.groupby("grille_densite_texte")["score_potentiel"].median().sort_values(ascending=False).index
sns.boxplot(data=df_box, x="grille_densite_texte", y="score_potentiel", order=order, ax=axes[1], palette="viridis")
axes[1].set_xlabel("")
axes[1].set_ylabel("Score de potentiel")
axes[1].set_title("Score par type de commune (grille densité)")
axes[1].tick_params(axis='x', rotation=45)

plt.suptitle("Analyse de la distribution du score ParkShare", fontsize=16, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(f"{OUTPUT}/distribution_score.png", dpi=150, bbox_inches='tight')
plt.close()
print("  -> distribution_score.png")


# =============================================================================
# 5. CARTE INTERACTIVE (Plotly)
# =============================================================================
print("5/6 - Carte interactive (Plotly HTML)")

# Charger le GeoJSON
with open("raw/communes_contours_100m.geojson", "r") as f:
    geojson = json.load(f)

# On ne garde que les communes scorées et avec un score > seuil pour la carte
df_map = df[df["score_potentiel"] > 0].copy()

# Carte choroplèthe avec Plotly
fig_map = px.choropleth_mapbox(
    df_map,
    geojson=geojson,
    locations="code_insee",
    featureidkey="properties.code",
    color="score_potentiel",
    color_continuous_scale="RdYlGn",
    range_color=[0, df_map["score_potentiel"].quantile(0.95)],
    mapbox_style="carto-positron",
    zoom=5,
    center={"lat": 46.6, "lon": 2.3},
    opacity=0.7,
    hover_name="nom_standard",
    hover_data={
        "code_insee": True,
        "dep_nom": True,
        "population": ":,.0f",
        "score_potentiel": ":.1f",
        "nb_coproprietes": ":,.0f",
        "total_lots_stationnement": ":,.0f",
        "taux_motorisation": ":.1f",
        "part_collectif": ":.1f",
        "taux_voiture_sans_garage": ":.1f",
    },
    labels={
        "score_potentiel": "Score",
        "nb_coproprietes": "Copropriétés",
        "total_lots_stationnement": "Lots parking",
        "taux_motorisation": "Motorisation %",
        "part_collectif": "Collectif %",
        "taux_voiture_sans_garage": "Sans garage %",
        "dep_nom": "Département",
        "population": "Population",
    }
)

fig_map.update_layout(
    title=dict(text="ParkShare - Score de potentiel par commune", font=dict(size=20)),
    margin={"r": 0, "t": 50, "l": 0, "b": 0},
    height=800,
)

fig_map.write_html(f"{OUTPUT}/carte_score.html")
print("  -> carte_score.html")


# =============================================================================
# 6. TOP 20 PAR DÉPARTEMENT (bar chart groupé)
# =============================================================================
print("6/6 - Top 15 départements par score moyen")

dep_agg = df.groupby(["dep_code", "dep_nom"]).agg(
    score_moyen=("score_potentiel", "mean"),
    nb_communes_scorees=("score_potentiel", "count"),
    nb_coproprietes_total=("nb_coproprietes", "sum"),
    population_totale=("population", "sum"),
).reset_index()

dep_agg = dep_agg[dep_agg["nb_communes_scorees"] >= 5]
top15_dep = dep_agg.nlargest(15, "score_moyen").sort_values("score_moyen")

fig, ax = plt.subplots(figsize=(14, 9))
colors = plt.cm.RdYlGn(top15_dep["score_moyen"] / top15_dep["score_moyen"].max())
bars = ax.barh(
    top15_dep["dep_nom"],
    top15_dep["score_moyen"],
    color=colors
)

for bar, val, nb in zip(bars, top15_dep["score_moyen"], top15_dep["nb_coproprietes_total"]):
    ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2,
            f'{val:.1f}  ({nb:,.0f} copros)', va='center', fontsize=10)

ax.set_xlabel("Score de potentiel moyen")
ax.set_title("Top 15 départements - Score moyen de potentiel ParkShare\n(min. 5 communes scorées)",
             fontsize=14, fontweight='bold')
ax.set_xlim(0, top15_dep["score_moyen"].max() * 1.3)
plt.tight_layout()
plt.savefig(f"{OUTPUT}/top15_departements.png", dpi=150, bbox_inches='tight')
plt.close()
print("  -> top15_departements.png")


# =============================================================================
# RÉSUMÉ
# =============================================================================
print("\n" + "=" * 60)
print("VISUALISATIONS TERMINÉES")
print("=" * 60)
for f in sorted(os.listdir(OUTPUT)):
    if f.endswith(('.png', '.html')):
        size = os.path.getsize(f"{OUTPUT}/{f}")
        print(f"  {f:40s} {size/1024:7.1f} KB")
