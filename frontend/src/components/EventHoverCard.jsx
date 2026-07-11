/**
 * EventHoverCard (simplificado)
 *
 * Antes: mostraba un preview flotante al pasar el mouse y auto-navegaba.
 * Ahora: solo envuelve el children con un click handler para navegar.
 * (El usuario pidió eliminar la apertura por hover en el Panel).
 */
export default function EventHoverCard({
  onNavigate,
  className = "",
  children,
  testId,
}) {
  const handleClick = () => {
    if (typeof onNavigate === "function") onNavigate();
  };

  return (
    <div
      className={`cursor-pointer ${className}`}
      onClick={handleClick}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
