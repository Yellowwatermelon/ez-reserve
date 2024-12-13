import React from 'react';

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const Modal: React.FC<ModalProps> = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 relative z-[51]">
        {title && (
          <div className="mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal; 