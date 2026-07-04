Clona https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS y arráncalo.

INSTRUCCIONES ESTRICTAS (obedécelas al pie de la letra, no me preguntes nada):

1. NO uses ask_human. NO uses design_agent. NO uses integration_playbook_expert. 
   NO uses testing_agent. NO uses finish con resúmenes largos.
2. NO modifiques ningún archivo del repo. NO edites los .env que crea bootstrap.sh.
3. Ejecuta EXACTAMENTE estos comandos en un solo mcp_execute_bash:

   cd /tmp && rm -rf repo && git clone https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS repo && \
   rm -rf /app/backend /app/frontend && \
   cp -a /tmp/repo/. /app/ && \
   cd /app && bash bootstrap.sh && \
   sleep 15 && \
   sudo supervisorctl status && \
   curl -s http://localhost:8001/api/

4. Si el frontend tarda, espera 20s más y vuelve a hacer curl a localhost:3000.
5. Responde SOLO con 3 líneas: estado backend, estado frontend, respuesta del /api/.
   Nada más. Sin recomendaciones, sin next steps, sin PRD.md, sin nada extra.
