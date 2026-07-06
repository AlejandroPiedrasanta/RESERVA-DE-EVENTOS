#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Rediseño total del calendario mensual en la página de reservaciones (/calendario, vista "Mes").
  Problemas reportados por el usuario:
  - El hover del ratón sobre las celdas del calendario no funciona bien (no se percibe).
  - Cuando hay un evento en una fecha, la celda debe brillar/destacar (glow).
  - Hacerlo más útil, más intuitivo, más animado. Rediseño total.

frontend:
  - task: "Rediseño calendario mensual (hover, glow celdas con eventos, animaciones)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/CalendarView.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Se rediseñaron por completo las celdas del grid del calendario mensual dentro de CalendarView.jsx (bloque {viewMode === "month"} → grid-cols-7).
          Cambios aplicados:
          1. Grid ahora usa gap-1.5 con padding y celdas con rounded-2xl (antes: bordes rectos con border-r/border-b y transiciones básicas).
          2. Hover en celda: whileHover con motion (scale 1.035 + y:-3, spring stiffness 300) — reemplaza el hover:bg-white/40 estático anterior, que no se sentía. Solo se activa en días válidos y no pasados.
          3. Celdas con eventos: fondo con gradiente sutil del color del tipo primario (linear-gradient de 14% opacity), inset boxShadow que pulsa (animate opacity 0.4→0.85→0.4, duración 2.4s) y un icono Sparkles animado en la esquina superior derecha (scale/rotate loop).
          4. Hover extra sobre celda con eventos: aparece un radial-gradient glow más intenso desde la esquina.
          5. Día actual: layoutId "today-ring" con doble anillo (interior sólido + exterior pulsante) para mayor visibilidad.
          6. Número de día: con color del tipo de evento primario cuando hay eventos, whileHover scale 1.15, dentro de un rounded-xl.
          7. Badge de conteo de eventos: círculo pequeño con el color del evento, aparece con spring animation, hover rotate.
          8. Botón "+" para crear evento aparece en hover con animación rotate 90.
          9. Chips de eventos: gradiente en fondo, animación spring de entrada con stagger, hover con scale/x/boxShadow coloreado, shadow-sm→shadow-md.
          10. "+X más": ahora es clickeable-friendly, con color del evento primario y hover scale.
          11. Se preserva el hover-card lateral (onChipEnter/onChipMove/onChipLeave) para detalles del evento.
          
          Cambios SOLO en /app/frontend/src/pages/CalendarView.jsx, bloque de renderizado de celdas (~líneas 268-370). Lint OK. Sin cambios en backend, API, ni en la ruta.

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Rediseño calendario mensual (hover, glow celdas con eventos, animaciones)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Ir a /calendario (o clic en "Reservaciones" en sidebar → vista "Mes" activa por defecto).
      Verificar:
      1. HOVER: pasar el mouse sobre una celda día vacía y sobre una con evento — debe animarse (escala/lift/sombra) de forma visible y suave.
      2. GLOW EVENTOS: las celdas que tienen al menos un evento deben verse claramente destacadas: gradiente sutil de fondo del color del tipo, inset ring pulsante, ícono Sparkles animado en la esquina, y un badge con el número de eventos.
      3. TODAY: la celda del día actual (6 de Julio 2026) tiene un anillo doble (interior sólido violeta + exterior pulsante).
      4. Al pasar mouse sobre un chip de evento debe aparecer una hover-card con detalles a la derecha (comportamiento preservado).
      5. Al hacer clic en una celda vacía se abre el formulario de nueva reserva.
      6. Al hacer clic en un chip de evento se navega a /reservaciones/:id.
      7. Navegación entre meses (chevrons) sigue funcionando con animación direccional.
      Ya existe una reserva de prueba el 09/07/2026 (Boda) para verificar el glow. Preview URL: https://evento-reserve-3.preview.emergentagent.com
