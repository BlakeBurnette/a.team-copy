import { createPortal } from 'react-dom';

const FabPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

export default FabPortal;
