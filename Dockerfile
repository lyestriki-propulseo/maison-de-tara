# Site statique Maison de Tara — servi par nginx.
#
# Les pages vivent dans wandau-mdt/ et référencent leurs assets en "../"
# (../assets-charte, ../Logo, ../assets-premium-lp). On place donc le contenu
# de wandau-mdt/ À LA RACINE web et les 3 dossiers d'assets au même niveau :
# le navigateur clampe "../" à la racine, donc /atelier.html → ../assets-premium-lp/x.jpg
# résout en /assets-premium-lp/x.jpg. URL de prod propre (pas de /wandau-mdt/).
FROM nginx:alpine

# Contenu du site à la racine web
COPY wandau-mdt/ /usr/share/nginx/html/
# Assets référencés en "../" par les pages
COPY assets-charte/      /usr/share/nginx/html/assets-charte/
COPY Logo/               /usr/share/nginx/html/Logo/
COPY assets-premium-lp/  /usr/share/nginx/html/assets-premium-lp/

# Sources de build (dev only) : pas besoin de les exposer publiquement
RUN rm -rf /usr/share/nginx/html/_src \
           /usr/share/nginx/html/_partials \
           /usr/share/nginx/html/build.mjs \
           /usr/share/nginx/html/tools

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
