# Carte Interactive des Festivals de Musique en France

Cette application web permet de visualiser sur une carte interactive tous les festivals de musique en France, en utilisant les données ouvertes du Ministère de la Culture.

## Fonctionnalités

- Carte interactive avec clusters de marqueurs pour une meilleure lisibilité
- Filtres par région, département, genre musical et période
- Recherche par nom de festival ou lieu
- Liste des festivals avec détails
- Vue détaillée de chaque festival
- Interface responsive adaptée aux mobiles et tablettes

## Technologies utilisées

- HTML5, CSS3, JavaScript
- [Leaflet](https://leafletjs.com/) pour la carte interactive
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) pour le regroupement des marqueurs
- API du Ministère de la Culture ([data.culture.gouv.fr](https://data.culture.gouv.fr/))

## Comment utiliser l'application

1. Clonez ce dépôt ou téléchargez les fichiers
2. Ouvrez le fichier `index.html` dans votre navigateur web
3. Explorez la carte et utilisez les filtres pour trouver des festivals

Pour un déploiement en ligne, vous pouvez simplement héberger les fichiers sur n'importe quel serveur web.

## Structure du projet

```
├── index.html          # Page principale
├── css/
│   └── style.css       # Styles de l'application
├── js/
│   ├── config.js       # Configuration (API, carte)
│   ├── api.js          # Gestion des appels à l'API
│   ├── map.js          # Gestion de la carte Leaflet
│   └── app.js          # Application principale
└── README.md           # Ce fichier
```

## Source des données

Les données proviennent de l'API du Ministère de la Culture français :
- Dataset : "Liste des festivals en France"
- URL : [https://data.culture.gouv.fr/explore/dataset/festivals-global-festivals-_-pl/](https://data.culture.gouv.fr/explore/dataset/festivals-global-festivals-_-pl/)

## Améliorations possibles

- Ajout d'un système de géolocalisation pour trouver les festivals à proximité
- Filtrage par date spécifique
- Intégration avec des API de billetterie
- Mode hors ligne avec mise en cache des données
- Ajout de photos et vidéos des festivals

## Licence

Ce projet est sous licence MIT. Vous êtes libre de l'utiliser, le modifier et le distribuer selon les termes de cette licence.
