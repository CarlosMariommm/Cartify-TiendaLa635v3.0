// useClientTheme — paleta FIJA del área de cliente ("Mi Cuenta"), que coincide con la app web de
// clientes / tienda (marrones cálidos), no con las paletas de accesibilidad del admin.
export const clientColors = {
  // Los roles de MARCA salen de los tokens de la tienda (--marca-*), no de hexes fijos.
  primary: 'var(--marca-600)',
  primaryHover: 'var(--marca-700)',
  primaryLight: 'var(--marca-100)',
  accent: 'var(--acento)',
  buttonText: '#ffffff',
  // Fondo blanco, igual que la tienda, y los colores neutros como tokens: con el modo oscuro cambian
  // solos, sin que ninguna página pregunte en qué modo está.
  mainBg: 'var(--papel)',
  topbarBg: 'var(--papel)',
  cardBg: 'var(--papel)',
  cardBorder: 'var(--linea)',
  sidebarBorder: 'var(--linea)',
  textPrimary: 'var(--tinta)',
  textSecondary: 'var(--tinta-suave)',
  textMuted: 'var(--tinta-tenue)',
};

export const useTheme = () => ({ palette: { colors: clientColors } });
