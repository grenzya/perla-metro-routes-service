/**
 * Verifica si el formato de hora es válido (HH:mm)
 * @param {*} time Tiempo en formato string
 * @returns {boolean} Verdadero si el formato es válido, falso en caso contrario
 */
export function isValidTimeFormat(time) {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(time);
}
