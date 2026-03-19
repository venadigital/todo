import { Square } from 'lucide-react';

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
            <span className="tracking-focus-worker__hair" />
            <span className="tracking-focus-worker__eye tracking-focus-worker__eye-left" />
            <span className="tracking-focus-worker__eye tracking-focus-worker__eye-right" />
            <span className="tracking-focus-worker__torso" />
            <span className="tracking-focus-worker__belt" />
            <span className="tracking-focus-worker__arm tracking-focus-worker__arm-left" />
            <span className="tracking-focus-worker__arm tracking-focus-worker__arm-mining">
              <span className="tracking-focus-pickaxe">
                <span className="tracking-focus-pickaxe__handle" />
                <span className="tracking-focus-pickaxe__head" />
              </span>
            </span>
            <span className="tracking-focus-worker__leg tracking-focus-worker__leg-left" />
            <span className="tracking-focus-worker__leg tracking-focus-worker__leg-right" />
            <span className="tracking-focus-worker__boot tracking-focus-worker__boot-left" />
            <span className="tracking-focus-worker__boot tracking-focus-worker__boot-right" />
          </div>

          <div className="tracking-focus-mountain">
            <span className="tracking-focus-mountain__block block-a" />
            <span className="tracking-focus-mountain__block block-b" />
            <span className="tracking-focus-mountain__block block-c" />
            <span className="tracking-focus-mountain__block block-d" />
            <span className="tracking-focus-mountain__block block-e" />
            <span className="tracking-focus-mountain__block block-f" />
            <span className="tracking-focus-mountain__block block-g" />
            <span className="tracking-focus-mountain__block block-h" />
            <span className="tracking-focus-mountain__block block-i" />
            <span className="tracking-focus-mountain__block block-j" />
            <span className="tracking-focus-mountain__block block-k" />
            <span className="tracking-focus-mountain__block block-l" />
            <span className="tracking-focus-mountain__block block-m" />
            <span className="tracking-focus-mountain__block block-n" />
          </div>

          <div className="tracking-focus-impact">
            <span className="tracking-focus-impact__particle tracking-focus-impact__particle-1" />
            <span className="tracking-focus-impact__particle tracking-focus-impact__particle-2" />
            <span className="tracking-focus-impact__particle tracking-focus-impact__particle-3" />
            <span className="tracking-focus-impact__particle tracking-focus-impact__particle-4" />
          </div>

          <div className="tracking-focus-ground">
            <span className="tracking-focus-ground__block" />
            <span className="tracking-focus-ground__block" />
            <span className="tracking-focus-ground__block" />
            <span className="tracking-focus-ground__block" />
            <span className="tracking-focus-ground__block" />
            <span className="tracking-focus-ground__block" />
            <span className="tracking-focus-ground__block" />
            <span className="tracking-focus-ground__block" />
            <span className="tracking-focus-ground__block" />
            <span className="tracking-focus-ground__block" />
          </div>
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
