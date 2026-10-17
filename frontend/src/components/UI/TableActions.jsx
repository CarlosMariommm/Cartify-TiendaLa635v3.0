import styled from 'styled-components';
import { Edit2, Trash2, Eye } from 'lucide-react';

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ActionBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Con los colores de la paleta del panel (ThemeContext), con los grises de siempre de respaldo.
     Fijos, en Modo oscuro el lápiz quedaba gris sobre gris y al pasar el mouse salía un parche
     blanco en medio de la tabla. */
  color: ${({ $danger }) => ($danger ? 'var(--theme-peligro, #ef4444)' : 'var(--theme-text-secondary, #6b7280)')};
  transition: background-color var(--dur-press) var(--ease-out), border-color var(--dur-press) var(--ease-out), color var(--dur-press) var(--ease-out), transform var(--dur-press) var(--ease-out), box-shadow var(--dur-press) var(--ease-out);
  padding: 6px;
  border-radius: 6px;

  &:hover {
    background: ${({ $danger }) => ($danger
      ? 'color-mix(in srgb, var(--theme-peligro, #ef4444) 14%, var(--theme-card-bg, #ffffff))'
      : 'var(--theme-primary-light, #f3f4f6)')};
    color: ${({ $danger }) => ($danger ? 'var(--theme-peligro, #dc2626)' : 'var(--theme-text-primary, #374151)')};
  }
`;

const TableActions = ({ onEdit, onDelete, onView }) => {
  return (
    <ActionsContainer onClick={(e) => e.stopPropagation()}>
      {onView && (
        <ActionBtn title="Ver detalle" onClick={(e) => { e.stopPropagation(); onView(); }}>
          <Eye size={18} />
        </ActionBtn>
      )}
      {onEdit && (
        <ActionBtn title="Editar" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Edit2 size={18} />
        </ActionBtn>
      )}
      {onDelete && (
        <ActionBtn $danger title="Eliminar" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 size={18} />
        </ActionBtn>
      )}
    </ActionsContainer>
  );
};

export default TableActions;
