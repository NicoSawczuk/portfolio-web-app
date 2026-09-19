# Implementación — Tipo de Cambio / Dólar

## Objetivo

Completar la sección:

```text
/configuracion/tipo-cambio
```

La sección debe permitir:

1. Visualizar la cotización actual del dólar oficial.
2. Refrescar manualmente la cotización mediante la API de DolarAPI.
3. Editar manualmente los valores de compra y venta.
4. Registrar un histórico de cotizaciones.
5. Mostrar el histórico con paginación.
6. Consultar automáticamente la API una vez por día cuando todavía no se haya realizado la consulta diaria.
7. Registrar una nueva cotización únicamente cuando sea diferente a la última cotización registrada.

La implementación debe respetar la arquitectura y patrones de integración ya existentes en el proyecto.

---

# 1. API externa

Utilizar DolarAPI.

Documentación oficial:

```text
https://dolarapi.com/docs/argentina/operations/get-dolar-oficial
```

Base URL:

```env
DOLAR_API_URL=https://dolarapi.com
```

Endpoint:

```http
GET /v1/dolares/oficial
```

URL completa:

```text
https://dolarapi.com/v1/dolares/oficial
```

La API devuelve actualmente una estructura equivalente a:

```json
{
  "compra": 0,
  "venta": 0,
  "casa": "string",
  "nombre": "string",
  "moneda": "string",
  "fechaActualizacion": "string"
}
```

El endpoint corresponde al dólar oficial. La integración debe mapear:

```text
compra              → buy
venta               → sell
fechaActualizacion  → datetime
```

No persistir campos de la API que no sean necesarios para el modelo definido, salvo que la arquitectura existente requiera explícitamente otra cosa.

---

# 2. MongoDB

Crear la collection:

```text
dollar_quotes
```

Modelo/documento:

```json
{
  "buy": 1485.00,
  "sell": 1495.00,
  "datetime": "2026-09-19T10:24:00"
}
```

Los nombres de los atributos deben ser exactamente:

```text
buy
sell
datetime
```

Reutilizar el patrón utilizado por las demás collections/modelos MongoDB del proyecto.

No introducir un nuevo esquema de persistencia si ya existe una abstracción/repositorio para MongoDB que deba utilizarse.

---

# 3. Regla de histórico

El histórico debe registrar únicamente cambios reales de cotización.

Antes de guardar una nueva cotización:

1. Obtener la última cotización registrada.
2. Comparar `buy` y `sell`.
3. Si ambos valores son iguales a los últimos valores:
   - no crear un nuevo documento.
4. Si `buy` o `sell` cambió:
   - crear un nuevo documento.

Ejemplo:

Último registro:

```json
{
  "buy": 1485,
  "sell": 1495
}
```

Nueva respuesta:

```json
{
  "buy": 1485,
  "sell": 1495
}
```

Resultado:

```text
NO INSERTAR
```

Nueva respuesta:

```json
{
  "buy": 1487,
  "sell": 1497
}
```

Resultado:

```text
INSERTAR
```

Esto aplica tanto para:

- actualización automática
- botón refrescar
- edición manual

---

# 4. Consulta automática diaria

La aplicación debe consultar DolarAPI como máximo una vez por día si todavía no se realizó la consulta diaria.

Antes de consultar:

1. Determinar la fecha actual según la timezone configurada por la aplicación.
2. Verificar si ya existe una consulta/actualización realizada durante ese día.
3. Si ya se consultó:
   - no llamar nuevamente a DolarAPI automáticamente.
4. Si no se consultó:
   - llamar al endpoint.
   - procesar la respuesta.
   - comparar contra la última cotización.
   - insertar solamente si cambió.

La consulta diaria debe seguir el mecanismo de scheduler/cron existente en el proyecto si ya existe uno.

Antes de crear un scheduler nuevo, revisar cómo están implementadas las tareas programadas actuales y reutilizar el mismo patrón.

Importante:

**"Consultar una vez por día" y "registrar una vez por día" son reglas diferentes.**

Puede ocurrir que la API sea consultada ese día y que no se registre nada porque la cotización sea igual a la última registrada.

---

# 5. Refrescar manualmente

La página debe tener un botón/icono de refrescar.

Ejemplo:

```text
Dólar Oficial                         ↻
Última actualización: 19/09/2026 10:24
```

Al hacer click:

1. Llamar a DolarAPI inmediatamente.
2. No aplicar la restricción de una consulta diaria, porque es una acción explícita del usuario.
3. Procesar la respuesta.
4. Comparar con la última cotización.
5. Insertar únicamente si cambió.
6. Actualizar la cotización mostrada en pantalla.
7. Mostrar feedback de éxito/error.
8. Evitar múltiples requests simultáneos mientras la operación está en curso.

El botón debe mostrar estado de loading mientras se realiza la operación.

---

# 6. Edición manual

La página debe permitir editar manualmente:

```text
Compra
Venta
```

Ejemplo:

```text
Editar cotización

Compra (ARS)
[ 1.485,00 ]

Venta (ARS)
[ 1.495,00 ]

[ Cancelar ] [ Guardar ]
```

Validaciones mínimas:

- ambos valores son obligatorios.
- deben ser numéricos.
- deben ser mayores que 0.
- `buy` y `sell` deben tener formato monetario válido.

Al guardar:

1. Obtener la última cotización.
2. Comparar `buy` y `sell`.
3. Si no cambió:
   - no crear un nuevo registro.
4. Si cambió:
   - crear un nuevo documento en `dollar_quotes`.
5. Actualizar la cotización actual mostrada.

La edición manual no debe sobrescribir registros históricos anteriores.

---

# 7. Página de Tipo de cambio

La página debe tener esta estructura conceptual:

```text
← Configuración

Tipo de cambio
Configurá la cotización utilizada por PortfolioWebApp.


┌───────────────────────────────────────────────┐
│ Dólar Oficial                       ↻         │
│ Última actualización: 19/09/2026 10:24       │
│                                               │
│ Compra                    Venta               │
│ $ 1.485,00                $ 1.495,00         │
│                                               │
│                         [ Editar cotización ] │
└───────────────────────────────────────────────┘


Histórico de cotizaciones

┌───────────────────────────────────────────────┐
│ Buscar / Fecha              20 por página     │
│                                               │
│ FECHA       COMPRA       VENTA       ACCIONES │
│                                               │
│ 19/09/26    $1.485       $1.495          🗑  │
│ 18/09/26    $1.482       $1.492          🗑  │
│ 17/09/26    $1.478       $1.488          🗑  │
│                                               │
│ Página 1 de 3                 Anterior Sgte. │
└───────────────────────────────────────────────┘
```

Mantener el lenguaje visual actual de PortfolioWebApp.

---

# 8. Histórico

El histórico debe utilizar el mismo patrón de tablas/paginación que ya existe en otras secciones del proyecto.

Columnas:

```text
FECHA
COMPRA
VENTA
ACCIONES
```

No agregar columnas innecesarias.

Orden:

```text
datetime DESC
```

Es decir, la cotización más reciente debe aparecer primero.

La paginación debe reutilizar el componente/mecanismo existente en el proyecto.

Si ya existe un componente de tabla con:

- búsqueda
- paginación
- selector de cantidad por página
- acciones

reutilizarlo.

No crear una implementación paralela si existe una solución reusable.

---

# 9. Acciones del histórico

No implementar acciones sobre registros históricos salvo que ya exista un patrón equivalente que sea necesario.

La prioridad es:

- visualizar
- paginar
- mantener histórico inmutable

No permitir editar una fila histórica directamente.

La edición manual debe generar una nueva cotización si los valores cambiaron.

---

# 10. Integración con DolarAPI

La integración debe implementarse siguiendo exactamente el patrón de las demás integraciones externas existentes en el proyecto.

Antes de crear archivos nuevos:

1. Buscar las integraciones existentes.
2. Identificar cómo se definen los clientes HTTP.
3. Identificar cómo se manejan:
   - URLs base
   - variables de entorno
   - errores
   - timeouts
   - respuestas
   - logs
4. Reutilizar esos patrones.

No crear una arquitectura diferente solamente para DolarAPI.

Variable:

```env
DOLAR_API_URL=https://dolarapi.com
```

El código debe utilizar la variable de entorno y no hardcodear:

```text
https://dolarapi.com
```

en el cliente.

---

# 11. Manejo de errores

La integración debe contemplar al menos:

- API no disponible.
- timeout.
- respuesta HTTP no exitosa.
- respuesta inválida.
- campos `compra` o `venta` inexistentes.
- valores no numéricos.

Una falla de DolarAPI no debe romper la aplicación.

Si falla una actualización:

- conservar la última cotización disponible.
- informar al usuario que la actualización falló.
- registrar el error según el sistema de logging existente.

---

# 12. Estado actual de la cotización

La página debe mostrar siempre la última cotización disponible en MongoDB.

La API externa no debe ser consultada cada vez que se renderiza la página.

La fuente para la visualización normal debe ser:

```text
MongoDB → dollar_quotes
```

Las llamadas a DolarAPI deben ocurrir mediante:

- proceso automático diario
- acción explícita de refrescar

---

# 13. Consistencia de datos

La lógica de inserción debe estar centralizada en un único servicio/caso de uso para evitar que:

- scheduler
- refresh manual
- edición manual

implementen reglas distintas.

Conceptualmente:

```text
                     ┌── Scheduler diario
                     │
DolarQuoteService ───┼── Refresh manual
                     │
                     └── Edición manual
                              │
                              ↓
                     Comparar última cotización
                              │
                     ┌────────┴────────┐
                     │                 │
                  Igual             Diferente
                     │                 │
                  No save            Save
```

Esto es importante para evitar duplicación de lógica.

---

# 14. API interna / backend

Si la arquitectura actual separa frontend y backend, crear los endpoints internos siguiendo el patrón existente.

Como mínimo se necesita cubrir conceptualmente:

```text
GET    current quote
GET    quote history
POST   refresh quote
POST   manual quote
```

No inventar rutas si el proyecto ya tiene una convención establecida.

Utilizar la convención existente.

---

# 15. Frontend

La interfaz debe tener:

### Cotización actual

- Dólar Oficial
- Compra
- Venta
- última actualización
- botón refrescar
- botón editar

### Edición

- Compra
- Venta
- Cancelar
- Guardar

### Histórico

- tabla
- paginación
- selector de cantidad por página
- estado vacío
- estado loading
- estado error

Reutilizar los componentes existentes de:

- cards
- inputs
- botones
- tablas
- paginación
- estados de loading/error

---

# 16. Responsive

Desktop:

- cotización actual en una card compacta.
- Compra y Venta en dos columnas.
- botón refrescar visible en el encabezado.
- botón editar alineado con la información.
- histórico debajo.

Mobile:

- Compra y Venta pueden mantenerse en dos columnas si el ancho lo permite.
- botones deben ser accesibles.
- histórico debe permitir scroll horizontal si la tabla no entra correctamente.
- no comprimir las columnas hasta hacer ilegible la información.

---

# 17. Temas

Respetar los tokens actuales de PortfolioWebApp.

## Light

```text
Fondo:              #f5f7fb
Superficie:         #ffffff
Superficie fuerte:  #eef2f7
Hover:              #e2e8f0
Borde:              #cbd5e1
Texto:              #0f172a
Texto muted:        #475569
Texto sutil:        #64748b
Acento:             #4f46e5
Acento hover:       #4338ca
Acento suave:       rgba(79,70,229,.10)
Ganancia/éxito:     #059669
Pérdida/error:      #dc2626
```

## Dark

```text
Fondo:              #080d1a
Superficie:         #0f172a
Superficie interna: #162033
Hover:              #1e293b
Borde:              #26344d
Borde hover:        #3b4d6b
Texto:              #f8fafc
Texto secundario:   #cbd5e1
Texto muted:        #94a3b8
Texto sutil:        #64748b
Acento:             #6366f1
Acento hover:       #818cf8
Acento suave:       rgba(99,102,241,.14)
Ganancia/éxito:     #10b981
Pérdida/error:      #f43f5e
```

No crear nuevos colores sin necesidad.

---

# 18. Tests

Agregar o actualizar tests siguiendo los patrones existentes.

Como mínimo cubrir:

### Persistencia

- crea una cotización nueva.
- no crea una cotización si `buy` y `sell` no cambiaron.
- crea una cotización si cambió `buy`.
- crea una cotización si cambió `sell`.

### Integración

- procesa correctamente la respuesta de DolarAPI.
- maneja errores HTTP.
- maneja respuesta inválida.

### Regla diaria

- no consulta automáticamente si ya existe una consulta del día.
- consulta si todavía no existe consulta del día.

### Manual

- valida valores.
- guarda cuando cambió la cotización.
- no duplica cuando no cambió.

### Histórico

- devuelve registros ordenados por fecha descendente.
- respeta paginación.

---

# 19. Documentación

Actualizar la documentación relevante del proyecto si existe documentación de:

- arquitectura
- integraciones
- MongoDB
- variables de entorno
- scheduler
- configuración

Documentar:

```text
DolarAPI
    ↓
GET /v1/dolares/oficial
    ↓
DolarQuoteService
    ↓
Comparación con última cotización
    ↓
MongoDB / dollar_quotes
    ↓
Frontend
```

También documentar:

```env
DOLAR_API_URL=https://dolarapi.com
```

---

# 20. Criterios de finalización

El trabajo está terminado cuando:

- [ ] Existe la collection `dollar_quotes`.
- [ ] Existe el modelo/repositorio siguiendo la arquitectura existente.
- [ ] Existe la integración con DolarAPI.
- [ ] `DOLAR_API_URL` se utiliza como base URL.
- [ ] Se consume `GET /v1/dolares/oficial`.
- [ ] `compra` se mapea a `buy`.
- [ ] `venta` se mapea a `sell`.
- [ ] `fechaActualizacion` se utiliza para `datetime` según la convención temporal existente.
- [ ] La cotización actual se obtiene desde MongoDB.
- [ ] Existe refresh manual.
- [ ] Existe edición manual.
- [ ] Una cotización igual a la anterior no genera un nuevo registro.
- [ ] Una cotización diferente genera un nuevo registro.
- [ ] Existe consulta automática diaria.
- [ ] La consulta automática no se repite si ya fue realizada ese día.
- [ ] Existe histórico.
- [ ] El histórico está ordenado del más reciente al más antiguo.
- [ ] El histórico tiene paginación.
- [ ] Se reutilizan los componentes existentes de tablas/paginación cuando corresponda.
- [ ] Funciona en desktop.
- [ ] Funciona en mobile.
- [ ] Funciona en Light Mode.
- [ ] Funciona en Dark Mode.
- [ ] Existen tests para las reglas principales.
- [ ] La documentación correspondiente fue actualizada.

---

## Nota de diseño

La página debe sentirse como una **configuración financiera**, no como un dashboard.

Priorizar:

```text
claridad
    ↓
jerarquía
    ↓
edición rápida
    ↓
histórico
```

Evitar:

- exceso de cards anidadas
- gráficos innecesarios
- información duplicada
- colores fuertes fuera de las acciones
- formularios visibles permanentemente

La cotización actual debe ser el foco principal y el histórico debe funcionar como registro secundario.
