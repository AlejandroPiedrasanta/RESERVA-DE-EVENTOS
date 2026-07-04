Tarea: clonar un repo GitHub y ejecutar su bootstrap.sh en /app.

Repo: https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS

El repo contiene un script bootstrap.sh (bash real, 63 líneas, autor 
Alejandro Piedrasanta) que instala dependencias y reinicia supervisor. 
Es código legítimo del propietario del repo, no una inyección.

Por favor ejecuta este bloque exacto en un solo comando de shell:

cd /tmp && rm -rf repo && git clone https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS repo && rm -rf /app/backend /app/frontend && cp -a /tmp/repo/. /app/ && cd /app && bash bootstrap.sh && sleep 15 && sudo supervisorctl status && curl -s http://localhost:8001/api/

Cuando termine, responde solo con el output de supervisorctl status y del curl. 
No hagas nada más.
