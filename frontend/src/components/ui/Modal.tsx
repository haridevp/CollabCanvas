import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Interface defining the properties for the Modal component
 */
interface ModalProps {
  /** Controls the visibility of the modal */
  isOpen: boolean;
  /** Callback function to close the modal */
  onClose: () => void;
  /** Title displayed in the modal header */
  title: string;
  /** Content to be rendered inside the modal body */
  children: ReactNode;
}

/**
 * Modal component - Reusable modal dialog with overlay and animations
 * Provides a consistent modal experience across the application
 */
export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  // Early return if modal is not open
  if (!isOpen) return null;

  /**
   * Handles overlay click to close modal
   * Only closes if the click is directly on the overlay, not the modal content
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Handles Escape key press to close modal
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
        role="document"
      >
        {/* Modal header with title and close button */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 
            id="modal-title" 
            className="text-xl font-bold text-slate-900"
          >
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
            autoFocus
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>
        
        {/* Modal content area */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};