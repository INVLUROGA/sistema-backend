# Módulo CheckList

Mantenimiento de inventario mediante checklists. Un checklist tiene una
cabecera (`tb_checklist`) y un detalle de items (`tb_checklist_item`), uno
por cada artículo activo del inventario de la empresa. Los items **no** se
crean ni se eliminan sueltos: nacen todos juntos al crear el checklist y la
única operación posible sobre ellos es actualizarlos (revisarlos).

- Base URL: `/api`
- Autenticación: todas las rutas requieren el header `x-token` (middleware `validarJWT`).
- Formato de respuesta: `{ ok: boolean, msg?: string, ... }`.
- Errores de validación de campos: `400 { ok: false, Componenterrors: {...} }` (middleware `validarCampos`).
- Borrado: soft-delete vía columna `flag` (nunca se borra físicamente la fila).

Archivos relacionados:
- `models/Checklist.js`
- `controller/checklist.controller.js`
- `controller/checklistItem.controller.js`
- `routes/checklist.router.js`
- `routes/checklistItem.router.js`

---

## Forma de los objetos

### Checklist (cabecera)

```jsonc
{
  "id": 1,
  "id_empresa": 5,
  "titulo": "Mantenimiento mensual",
  "fecha_checklist": "2026-09-07",
  "responsable": "Juan Pérez",
  "observacion_general": "Revisión general de equipos",
  "estado": "PENDIENTE" // "PENDIENTE" | "COMPLETADO"
}
```

Cuando el endpoint devuelve el checklist con detalle, se agrega:

```jsonc
{
  // ...campos de arriba
  "items": [ /* Checklist Item */ ]
}
```

### Checklist Item

```jsonc
{
  "id": 10,
  "id_checklist": 1,
  "id_articulo": 42,
  "producto": "Bicicleta estática", // nombre del artículo, denormalizado
  "opciones": ["arreglo", "limpieza"], // subset de OPCIONES_CHECKLIST_ITEM
  "observacion": "Falta lubricar cadena",
  "revisado": true,
  "uid_imagen_item": "c1e2...uuid",
  "uid_foto_antes": "a3f4...uuid",
  "uid_foto_despues": "b5c6...uuid"
}
```

`opciones` válidas (`OPCIONES_CHECKLIST_ITEM` en `models/Checklist.js`):

```
arreglo, ajuste, cambio, pintura, limpieza, lubricacion, revision_electrica, otros
```

---

## Endpoints — Checklist (cabecera)

### `POST /checklist/:id_empresa`

Crea la cabecera de un checklist para una empresa. En la **misma
transacción** se genera automáticamente un item por cada artículo activo
del inventario de esa empresa (reutiliza `obtenerArticulosActivos` de
`inventario.controller.js`, el mismo filtro `flag: true, id_empresa` que
usa el módulo de inventario), todos con `revisado: false`.

**Params:** `id_empresa` (int)

**Body:**
```jsonc
{
  "titulo": "Mantenimiento mensual",
  "fecha_checklist": "2026-09-07",
  "responsable": "Juan Pérez",
  "observacion_general": "Revisión general de equipos" // opcional
}
```

**Validaciones:** `id_empresa` numérico; `titulo`, `fecha_checklist`,
`responsable` obligatorios.

**Respuesta `201`:**
```jsonc
{
  "ok": true,
  "msg": "CHECKLIST REGISTRADO",
  "checklist": {
    "id": 1,
    "id_empresa": 5,
    "titulo": "Mantenimiento mensual",
    "fecha_checklist": "2026-09-07",
    "responsable": "Juan Pérez",
    "observacion_general": "Revisión general de equipos",
    "estado": "PENDIENTE",
    "items": [ /* uno por cada artículo activo, opciones: [], revisado: false */ ]
  }
}
```

---

### `GET /checklist/empresa/:id_empresa`

Lista los checklist en estado `PENDIENTE` de una empresa. **Sin items.**

**Params:** `id_empresa` (int)

**Respuesta `200`:**
```jsonc
{
  "ok": true,
  "checklists": [
    {
      "id": 1,
      "id_empresa": 5,
      "titulo": "Mantenimiento mensual",
      "fecha_checklist": "2026-09-07",
      "responsable": "Juan Pérez",
      "observacion_general": "Revisión general de equipos",
      "estado": "PENDIENTE"
    }
  ]
}
```

---

### `GET /checklist/historial/:id_empresa`

Igual que el anterior pero filtrando `estado = 'COMPLETADO'` (histórico).
**Sin items**, pero cada checklist incluye tres campos calculados a partir
de sus items (se consultan solo `id_checklist` + `revisado`, no se trae el
arreglo completo de items):

- `total_items`: cantidad total de items del checklist
- `revisados`: cantidad de items con `revisado = true`
- `no_revisados`: `total_items - revisados`

**Params:** `id_empresa` (int)

**Respuesta `200`:**
```jsonc
{
  "ok": true,
  "checklists": [
    {
      "id": 3,
      "id_empresa": 5,
      "titulo": "Mantenimiento mensual",
      "fecha_checklist": "2026-08-01",
      "responsable": "Juan Pérez",
      "observacion_general": "Revisión general de equipos",
      "estado": "COMPLETADO",
      "total_items": 12,
      "revisados": 10,
      "no_revisados": 2
    }
  ]
}
```

---

### `GET /checklist/id/:id`

Obtiene un checklist puntual **con todos sus items**.

**Params:** `id` (int)

**Respuesta `200`:**
```jsonc
{
  "ok": true,
  "checklist": {
    "id": 1,
    "id_empresa": 5,
    "titulo": "Mantenimiento mensual",
    "fecha_checklist": "2026-09-07",
    "responsable": "Juan Pérez",
    "observacion_general": "Revisión general de equipos",
    "estado": "PENDIENTE",
    "items": [ /* Checklist Item */ ]
  }
}
```

**Respuesta `404`** si no existe (o fue eliminado):
```jsonc
{ "ok": false, "msg": "El checklist no existe" }
```

---

### `PUT /checklist/id/:id`

Actualiza la cabecera (mismos campos que el POST).

**Params:** `id` (int)

**Body:**
```jsonc
{
  "titulo": "Mantenimiento mensual (actualizado)",
  "fecha_checklist": "2026-09-08",
  "responsable": "Juan Pérez",
  "observacion_general": "Revisión general de equipos"
}
```

**Validaciones:** mismas que el POST, más `id` numérico.

**Respuesta `200`:**
```jsonc
{ "ok": true, "msg": "CHECKLIST ACTUALIZADO" }
```

---

### `PUT /checklist/completar/id/:id`

Marca el checklist como `estado = 'COMPLETADO'` (pasa al histórico).

**Params:** `id` (int)

**Respuesta `200`:**
```jsonc
{ "ok": true, "msg": "CHECKLIST FINALIZADO" }
```

---

### `PUT /checklist/delete/id/:id`

Soft-delete del checklist (`flag = false`, no borra físicamente la fila).

**Params:** `id` (int)

**Respuesta `200`:**
```jsonc
{ "ok": true, "msg": "CHECKLIST ELIMINADO" }
```

---

## Endpoints — Checklist Item (revisión por artículo)

Los items nacen todos juntos al crear el checklist (uno por artículo del
inventario). No hay `POST` ni `DELETE` de items sueltos; la única
operación es revisarlo/actualizarlo.

### `PUT /checklist-item/id/:id`

Actualiza la revisión de un item existente. Si el item aún no tenía
`uid_imagen_item` / `uid_foto_antes` / `uid_foto_despues`, el backend los
genera (uuid v4) para que el frontend pueda subir cada binario justo
después con el endpoint **ya existente**:

```
POST /storage/blob/create/:uid_image?container=checklist-items
```

(no se reimplementa; este endpoint solo genera y devuelve los `uid`).

**Params:** `id` (int, id del item)

**Body:**
```jsonc
{
  "opciones": ["arreglo", "limpieza"],
  "observacion": "Falta lubricar cadena",
  "revisado": true
}
```

**Validaciones:** `id` numérico; `opciones` debe ser un arreglo cuyos
elementos pertenezcan a `OPCIONES_CHECKLIST_ITEM`; `revisado` booleano.

**Respuesta `200`:**
```jsonc
{
  "ok": true,
  "msg": "ITEM ACTUALIZADO",
  "item": {
    "id": 10,
    "id_checklist": 1,
    "id_articulo": 42,
    "producto": "Bicicleta estática",
    "opciones": ["arreglo", "limpieza"],
    "observacion": "Falta lubricar cadena",
    "revisado": true,
    "uid_imagen_item": "c1e2...uuid",
    "uid_foto_antes": "a3f4...uuid",
    "uid_foto_despues": "b5c6...uuid"
  }
}
```

**Respuesta `404`** si el item no existe:
```jsonc
{ "ok": false, "msg": "El item del checklist no existe" }
```

---

## Tabla resumen

| Método | Ruta                                  | Descripción                                   |
| ------ | -------------------------------------- | ---------------------------------------------- |
| POST   | `/checklist/:id_empresa`               | Crea checklist + items (1 por artículo activo) |
| GET    | `/checklist/empresa/:id_empresa`       | Lista checklists `PENDIENTE` (sin items)       |
| GET    | `/checklist/historial/:id_empresa`     | Lista checklists `COMPLETADO` + conteos        |
| GET    | `/checklist/id/:id`                    | Checklist puntual con items                    |
| PUT    | `/checklist/id/:id`                    | Actualiza cabecera                             |
| PUT    | `/checklist/completar/id/:id`          | Marca `estado = COMPLETADO`                    |
| PUT    | `/checklist/delete/id/:id`             | Soft-delete de la cabecera                     |
| PUT    | `/checklist-item/id/:id`               | Actualiza revisión de un item                  |
