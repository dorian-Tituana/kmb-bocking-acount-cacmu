export function validarCedulaEcuatoriana(valor) {
  const cedula = String(valor || "").trim();

  if (!/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provincia = Number(cedula.slice(0, 2));
  const tercerDigito = Number(cedula[2]);

  if (provincia < 1 || provincia > 24) {
    return false;
  }

  if (tercerDigito >= 6) {
    return false;
  }

  let suma = 0;
  for (let i = 0; i < 9; i += 1) {
    let valorDigito = Number(cedula[i]);
    if (i % 2 === 0) {
      valorDigito *= 2;
      if (valorDigito > 9) {
        valorDigito -= 9;
      }
    }
    suma += valorDigito;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === Number(cedula[9]);
}
