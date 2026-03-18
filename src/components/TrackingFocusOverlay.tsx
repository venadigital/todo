import { Pickaxe, Shovel, Square } from 'lucide-react';

interface TrackingFocusOverlayProps {
  taskTitle: string;
  elapsed: string;
  onStop: () => void;
}

export const TrackingFocusOverlay = ({ taskTitle, elapsed, onStop }: TrackingFocusOverlayProps) => {
  return (
    <div className="tracking-focus-overlay" role="dialog" aria-modal="true" aria-label="Trabajo en curso">
      <section className="tracking-focus-modal">
        <p className="tracking-focus-modal__label">Modo foco activo</p>
        <h2 className="tracking-focus-modal__title">{taskTitle}</h2>
        <p className="tracking-focus-modal__clock" aria-live="polite" aria-label="Tiempo transcurrido">
          {elapsed}
        </p>

        <div className="tracking-focus-scene" aria-hidden="true">
          <div className="tracking-focus-worker">
            <span className="tracking-focus-worker__head" />
            <span className="tracking-focus-worker__torso" />
            <span className="tracking-focus-worker__arm tracking-focus-worker__arm-left" />
            <span className="tracking-focus-worker__arm tracking-focus-worker__arm-right" />
            <span className="tracking-focus-worker__leg tracking-focus-worker__leg-left" />
            <span className="tracking-focus-worker__leg tracking-focus-worker__leg-right" />
          </div>
          <div className="tracking-focus-tools">
            <Pickaxe size={20} className="tracking-focus-tool tracking-focus-tool-pickaxe" />
            <Shovel size={20} className="tracking-focus-tool tracking-focus-tool-shovel" />
          </div>
          <div className="tracking-focus-ground" />
        </div>

        <button type="button" className="button button-danger" onClick={onStop}>
          <span className="button-content">
            <Square size={12} aria-hidden="true" />
            Detener trabajo
          </span>
        </button>
      </section>
    </div>
  );
};
