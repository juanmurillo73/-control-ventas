// Tablas oficiales de comisión (Siigo). No modificar valores sin actualizar el PDF de referencia.

// % de Pago y % de Acelerador de sobrecumplimiento, según % de cumplimiento (70% a 136%).
// De 136% en adelante el valor se mantiene igual (tope de la tabla original).
export const TABLA_PAGO = {
  70:{pago:9.1,acelerador:0}, 71:{pago:9.2,acelerador:0}, 72:{pago:9.4,acelerador:0}, 73:{pago:9.5,acelerador:0},
  74:{pago:9.6,acelerador:0}, 75:{pago:9.8,acelerador:0}, 76:{pago:9.9,acelerador:0}, 77:{pago:10.0,acelerador:0},
  78:{pago:10.1,acelerador:0}, 79:{pago:10.3,acelerador:0}, 80:{pago:10.4,acelerador:0}, 81:{pago:10.5,acelerador:0},
  82:{pago:10.7,acelerador:0}, 83:{pago:10.8,acelerador:0}, 84:{pago:10.9,acelerador:0}, 85:{pago:11.1,acelerador:0},
  86:{pago:11.2,acelerador:0}, 87:{pago:11.3,acelerador:0}, 88:{pago:11.4,acelerador:0}, 89:{pago:11.6,acelerador:0},
  90:{pago:11.7,acelerador:0}, 91:{pago:11.8,acelerador:0}, 92:{pago:12.0,acelerador:0}, 93:{pago:12.1,acelerador:0},
  94:{pago:12.2,acelerador:0}, 95:{pago:12.4,acelerador:0}, 96:{pago:12.5,acelerador:0}, 97:{pago:12.6,acelerador:0},
  98:{pago:12.7,acelerador:0}, 99:{pago:12.9,acelerador:0},
  100:{pago:13.0,acelerador:2.0}, 101:{pago:13.2,acelerador:2.0}, 102:{pago:13.4,acelerador:2.0}, 103:{pago:13.6,acelerador:2.0},
  104:{pago:13.7,acelerador:2.0}, 105:{pago:13.9,acelerador:2.0}, 106:{pago:14.1,acelerador:2.0}, 107:{pago:14.3,acelerador:2.0},
  108:{pago:14.5,acelerador:2.0}, 109:{pago:14.7,acelerador:2.0},
  110:{pago:14.9,acelerador:3.0}, 111:{pago:15.1,acelerador:3.0}, 112:{pago:15.4,acelerador:3.0}, 113:{pago:15.6,acelerador:3.0},
  114:{pago:15.8,acelerador:3.0}, 115:{pago:16.0,acelerador:3.0}, 116:{pago:16.2,acelerador:3.0}, 117:{pago:16.5,acelerador:3.0},
  118:{pago:16.7,acelerador:3.0}, 119:{pago:16.9,acelerador:3.0},
  120:{pago:17.2,acelerador:4.0}, 121:{pago:17.4,acelerador:4.0}, 122:{pago:17.6,acelerador:4.0}, 123:{pago:17.9,acelerador:4.0},
  124:{pago:18.1,acelerador:4.0},
  125:{pago:18.4,acelerador:5.0}, 126:{pago:18.6,acelerador:5.0}, 127:{pago:18.9,acelerador:5.0}, 128:{pago:19.2,acelerador:5.0},
  129:{pago:19.4,acelerador:5.0}, 130:{pago:19.7,acelerador:5.0}, 131:{pago:20.0,acelerador:5.0}, 132:{pago:20.3,acelerador:5.0},
  133:{pago:20.5,acelerador:5.0}, 134:{pago:20.8,acelerador:5.0}, 135:{pago:21.1,acelerador:5.0}, 136:{pago:21.4,acelerador:5.0},
};

// Acelerador por Adiciones de Nómina Electrónica: filas = cantidad, columnas = bracket de cumplimiento
export const TABLA_ADICIONES = [
  { c80:0,    c90:0,    c100_135:0,    c135plus:0    }, // 0
  { c80:0.30, c90:1.80, c100_135:3.30, c135plus:4.50 }, // 1 a 2
  { c80:0.60, c90:2.10, c100_135:3.60, c135plus:4.80 }, // 3 a 5
  { c80:0.90, c90:2.40, c100_135:3.90, c135plus:5.10 }, // 6 a 8
  { c80:1.20, c90:2.70, c100_135:4.20, c135plus:5.40 }, // 9 a 11
  { c80:1.50, c90:3.00, c100_135:4.50, c135plus:5.70 }, // >=12
];

// Acelerador por Upgrades: misma estructura
export const TABLA_UPGRADES = [
  { c80:0,    c90:0,    c100_135:0,    c135plus:0    }, // 0
  { c80:0.50, c90:3.00, c100_135:5.50, c135plus:7.50 }, // 1 a 2
  { c80:1.00, c90:3.50, c100_135:6.00, c135plus:8.00 }, // 3 a 5
  { c80:1.50, c90:4.00, c100_135:6.50, c135plus:8.50 }, // 6 a 8
  { c80:2.00, c90:4.50, c100_135:7.00, c135plus:9.00 }, // 9 a 11
  { c80:2.50, c90:5.00, c100_135:7.50, c135plus:9.50 }, // >=12
];

// % de Pago y % de acelerador de sobrecumplimiento según el % de cumplimiento del mes.
// <70% => sin comisión (0/0). >136% => se mantiene el tope de la tabla (136).
export function getPagoYAcelerador(cumplimientoPct) {
  if (cumplimientoPct < 70) return { pago: 0, acelerador: 0 };
  const idx = Math.min(Math.floor(cumplimientoPct), 136);
  return TABLA_PAGO[idx] || { pago: 0, acelerador: 0 };
}

// Busca el % de acelerador (adiciones o upgrades) según la cantidad y el % de cumplimiento.
// <80% de cumplimiento => 0, sin importar la cantidad.
export function getAceleradorTabla(tabla, cantidad, cumplimientoPct) {
  if (cumplimientoPct < 80) return 0;
  const row =
    cantidad === 0 ? 0 :
    cantidad <= 2 ? 1 :
    cantidad <= 5 ? 2 :
    cantidad <= 8 ? 3 :
    cantidad <= 11 ? 4 : 5;
  let col;
  if (cumplimientoPct < 90) col = 'c80';
  else if (cumplimientoPct < 100) col = 'c90';
  else if (cumplimientoPct <= 135) col = 'c100_135';
  else col = 'c135plus';
  return tabla[row][col];
}
