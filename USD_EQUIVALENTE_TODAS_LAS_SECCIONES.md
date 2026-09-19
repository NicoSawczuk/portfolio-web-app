# USD equivalente — integración en todas las vistas

## Objetivo

Incorporar una referencia del valor aproximado en USD en las vistas donde aporta contexto sobre el patrimonio, **sin ensuciar el diseño ni duplicar información innecesariamente**.

La moneda principal de cada portfolio continúa siendo la protagonista.

Regla visual general:

```text
ARS → dato principal
≈ USD → referencia secundaria
```

El equivalente USD debe mostrarse únicamente cuando el valor original esté expresado en **ARS**.

La conversión siempre utiliza la cotización actual del:

```text
Dólar Oficial — Venta
```

Fórmula:

```text
USD equivalente = valor actual en ARS / dollar_quotes.sell
```

Ejemplo:

```text
ARS 845.400,00
≈ USD 565,48
```

El símbolo `≈` es obligatorio.

---

# 1. Reglas generales de diseño

## Jerarquía

El valor original mantiene toda la jerarquía visual actual.

Ejemplo:

```text
ARS 845.400,00
≈ USD 565,48
```

El equivalente USD debe ser:

- considerablemente más pequeño;
- color `muted` / secundario;
- peso normal;
- sin fondo;
- sin borde;
- sin card propia;
- sin icono;
- sin color indigo;
- sin color verde;
- sin color rojo;
- sin competir visualmente con el valor ARS.

### No hacer

```text
ARS 845.400,00       USD 565,48
```

si eso obliga a crear una segunda columna.

Tampoco:

```text
┌───────────────────┐
│ USD 565,48        │
└───────────────────┘
```

Ni:

```text
[ USD 565,48 ]
```

La equivalencia es simplemente una línea secundaria del valor existente.

---

# 2. Fuente de la cotización

Utilizar la infraestructura existente de `dollar_quotes`.

Modelo:

```text
buy
sell
datetime
```

Para las conversiones utilizar exclusivamente:

```text
dollar_quotes.sell
```

No utilizar `buy`.

No consultar DolarAPI directamente desde el frontend.

No crear una integración nueva si ya existe el servicio/repository correspondiente.

La cotización proviene del Dólar Oficial y se utiliza su valor de venta actual.

---

# 3. Regla de visibilidad

Mostrar el equivalente solamente cuando:

```text
portfolio.currency === 'ARS'
```

y:

```text
dollarQuote.sell > 0
```

Si el portfolio está denominado en USD, no mostrar ninguna conversión.

Ejemplo:

```text
USD 17.925,12
```

Debe permanecer así.

No mostrar:

```text
USD 17.925,12
≈ USD 17.925,12
```

Si no existe una cotización válida:

```text
ARS 845.400,00
```

sin placeholder ni mensaje de error dentro del bloque.

---

# 4. HOME

## 4.1 Valor actual

### Actual

```text
Valor actual   ARS

ARS 845.400,00
```

### Nuevo

```text
Valor actual   ARS

ARS 845.400,00
≈ USD 565,48
```

El USD debe aparecer inmediatamente debajo del valor ARS.

No modificar:

- selector USD/ARS;
- Valor invertido;
- Ganancia;
- porcentaje;
- distribución del bloque.

### Importante

En Home **solo convertir el Valor actual global**.

No mostrar:

```text
Valor invertido
ARS 794.560,00
≈ USD ...
```

ni:

```text
Ganancia
+ARS 50.840,00
≈ USD ...
```

La ganancia no debe convertirse porque representaría otra métrica financiera y puede generar confusión respecto del rendimiento.

---

## 4.2 Inversión por portfolio

Para cada portfolio denominado en ARS:

### Actual

```text
General Pesos   ARS

100,0%

ARS 845.400,00
```

### Nuevo

```text
General Pesos   ARS

100,0%

ARS 845.400,00
≈ USD 565,48
```

El equivalente debe ser pequeño y secundario.

Para portfolios USD no agregar nada.

Ejemplo:

```text
General         USD

84,8%

USD 17.925,12
```

Debe permanecer exactamente con la lógica actual.

### Compactación

El equivalente no debe hacer que las cinco cards de portfolio crezcan considerablemente.

Si es necesario, reducir ligeramente el espacio vertical entre el valor y el borde inferior de la card, pero no cambiar la estructura general.

---

## 4.3 Ganancias por portfolio

**NO agregar equivalente USD.**

Mantener:

```text
General Pesos    ARS

+ARS 50.840,00
+6,40%
```

No convertir la ganancia.

Motivo:

La sección representa rendimiento/ganancia del portfolio, no valuación patrimonial actual.

---

# 5. LISTA DE PORTFOLIOS

Ruta conceptual:

```text
/portfolios
```

En portfolios ARS agregar el equivalente debajo del valor principal.

### Actual

```text
General Pesos                         ARS 845.400,00
                                     ↑ +ARS 50.840,00
                                     +6,40%
```

### Nuevo

```text
General Pesos                         ARS 845.400,00
                                     ≈ USD 565,48
                                     ↑ +ARS 50.840,00
                                     +6,40%
```

El valor ARS continúa siendo el elemento dominante.

El equivalente debe utilizar una tipografía claramente menor.

### Portfolio USD

Mantener:

```text
Test                                  USD 900,00
                                     → USD 0,00
                                     +0,00%
```

Sin equivalencia adicional.

### Fecha

No mover ni eliminar:

```text
CREADO 18 DE SEPT DE 2026
```

### Acciones

No modificar los botones de editar/eliminar.

---

# 6. DETALLE DEL PORTFOLIO

Ruta conceptual:

```text
/portfolios/{id}
```

Esta pantalla debe mostrar el equivalente en el encabezado/resumen del portfolio.

### Actual

```text
PORTFOLIO

General Pesos   ARS

ARS 845.400,00
↑ +ARS 50.840,00   +6,40%

Portfolio de inversiones generales en pesos
```

### Nuevo

```text
PORTFOLIO

General Pesos   ARS

ARS 845.400,00
≈ USD 565,48

↑ +ARS 50.840,00   +6,40%

Portfolio de inversiones generales en pesos
```

No crear una nueva card.

No crear una nueva columna.

No modificar la sección de posiciones.

La equivalencia pertenece al resumen del portfolio.

---

# 7. POSICIONES

## NO mostrar equivalente USD

La vista de posiciones debe permanecer compacta.

Ejemplo:

```text
Cedear Facebook                         ARS 308.000,00
META                                    +ARS 49.840,00
                                        +19,31%

Cantidad          Precio actual         Precio prom.
7                 ARS 44.000            ARS 36.880

Valor invertido   % del portfolio
ARS 258.160       36,43%
```

No agregar:

```text
≈ USD 205,69
```

a cada posición.

### Motivo

Una cartera puede tener muchas posiciones.

Agregar una segunda línea a cada card:

- aumenta considerablemente la altura;
- reduce la cantidad de posiciones visibles;
- duplica información;
- hace que el dashboard se sienta pesado.

La equivalencia queda disponible en el detalle del activo.

---

# 8. DETALLE DEL ACTIVO

Esta es la vista donde la equivalencia tiene mayor importancia.

Ruta conceptual:

```text
/portfolios/{portfolio}/positions/{position}
```

## Valor actual

### Actual

```text
VALOR ACTUAL

ARS 308.000,00
```

### Nuevo

```text
VALOR ACTUAL

ARS 308.000,00
≈ USD 205,69
```

El USD debe estar inmediatamente debajo del valor ARS.

### Mantener

```text
GANANCIA
+ARS 49.840,00

RENDIMIENTO
+19,31%
```

No convertir estas métricas.

---

## 8.1 Datos secundarios

Mantener exactamente la estructura actual:

```text
Cantidad              Precio actual
7                     ARS 44.000,00

Precio promedio       Valor invertido
ARS 36.880,00         ARS 258.160,00

% del portfolio       Primera compra
36,43%                24/08/2026

Última compra
24/08/2026
```

No agregar equivalentes USD a estos campos.

---

## 8.2 Mobile

Mantener el diseño compacto actual:

```text
VALOR ACTUAL

ARS 308.000,00
≈ USD 205,69

────────────────

GANANCIA          RENDIMIENTO
+ARS 49.840       +19,31%
```

No crear una fila independiente para USD.

No generar scroll horizontal.

---

# 9. TRANSACCIONES

## NO mostrar equivalente USD

La tabla de transacciones debe permanecer exactamente como está.

Mantener:

```text
FECHA
TIPO
CANTIDAD
PRECIO
TOTAL
ACCIONES
```

No agregar:

```text
USD
```

como columna.

No convertir:

- precio histórico;
- total histórico;
- cantidad;
- compras;
- ventas.

### Motivo

La conversión utiliza la cotización actual, por lo que no representa correctamente el valor histórico de una transacción.

La referencia USD es exclusivamente sobre el **valor actual**.

---

# 10. CONFIGURACIÓN → TIPO DE CAMBIO

No agregar equivalentes USD adicionales en esta pantalla.

La sección de configuración debe seguir mostrando la cotización completa:

```text
Tipo de cambio

Dólar Oficial

Compra        Venta
$ 1.485,00    $ 1.495,00

Última actualización
19/09/2026 10:24
```

Esta pantalla es la fuente de consulta/edición de la cotización.

El resto de la aplicación solamente consume el valor `sell`.

---

# 11. Tooltip opcional

Si el proyecto ya posee un Tooltip/Popover reutilizable, puede agregarse junto al equivalente:

```text
≈ USD 205,69  ⓘ
```

Al interactuar:

```text
Equivalencia calculada con dólar oficial

Venta: ARS 1.495,00
Actualizado: 19/09/2026 10:24
```

No crear un nuevo sistema de tooltip únicamente para esta funcionalidad.

Si no existe un componente reutilizable, mostrar solamente:

```text
≈ USD 205,69
```

---

# 12. Qué significa el equivalente

El equivalente representa:

> ¿Cuántos dólares aproximadamente representa el valor actual del activo/portfolio utilizando el dólar oficial venta actual?

No representa:

- costo histórico en USD;
- ganancia histórica en USD;
- rendimiento en USD;
- precio de compra convertido;
- valor invertido convertido;
- tipo de cambio utilizado en la fecha de compra.

Por eso siempre debe utilizar la cotización **actual**.

---

# 13. Ejemplo de cambio del dólar

Activo:

```text
Valor actual:
ARS 308.000
```

Dólar oficial venta:

```text
ARS 1.495
```

Resultado:

```text
≈ USD 205,69
```

Si el activo sigue valiendo:

```text
ARS 308.000
```

pero el dólar venta cambia a:

```text
ARS 1.520
```

el resultado pasa a:

```text
≈ USD 202,63
```

Esto es correcto y esperado.

No persistir el equivalente USD.

Es un dato derivado.

---

# 14. Performance

No hacer consultas individuales por cada componente.

Evitar:

```text
Home → consulta dólar
Portfolio card 1 → consulta dólar
Portfolio card 2 → consulta dólar
Portfolio card 3 → consulta dólar
...
```

La cotización debe obtenerse mediante el mecanismo existente del backend y reutilizarse dentro de la respuesta/contexto correspondiente.

No llamar a DolarAPI desde React/Next.js/browser.

No hacer requests al renderizar cada componente.

---

# 15. Arquitectura

Antes de implementar:

1. Revisar cómo se obtiene actualmente la cotización `dollar_quotes`.
2. Revisar los services/repositories existentes.
3. Revisar cómo se carga el portfolio y su moneda.
4. Revisar cómo se calcula actualmente el valor actual.
5. Reutilizar los formatters monetarios existentes.
6. Reutilizar los design tokens existentes.
7. Reutilizar componentes existentes.
8. No duplicar lógica.
9. No crear endpoints nuevos si el backend actual ya expone la información necesaria.
10. Seguir las convenciones arquitectónicas actuales del proyecto.

---

# 16. Formato visual

Usar siempre:

```text
≈ USD 205,69
```

No usar:

```text
USD ≈ 205,69
```

No usar:

```text
USD 205,69 aprox.
```

No usar:

```text
$ 205,69 USD
```

El `≈` debe ser la señal visual de que es una equivalencia.

---

# 17. Tipografía

El equivalente debe ser notablemente menor que el valor principal.

Ejemplo conceptual:

```text
ARS 845.400,00       ← tamaño principal actual
≈ USD 565,48         ← tamaño secundario
```

No modificar el tamaño del valor principal para hacer espacio.

No utilizar una fuente diferente.

No usar negrita fuerte.

No usar mayúsculas.

---

# 18. Colores

Usar los tokens existentes del tema.

### Valor principal

```text
text-primary
```

### Equivalente USD

```text
text-muted
```

o el token equivalente existente.

### Ganancia

Mantener:

```text
success / gain
```

### Pérdida

Mantener:

```text
danger / loss
```

El equivalente USD no debe adoptar el color verde aunque el activo tenga ganancia.

---

# 19. Matriz final de implementación

| Sección | Mostrar USD | Qué convertir |
|---|---:|---|
| Home — Valor actual | ✅ | Valor actual global |
| Home — Inversión por portfolio | ✅ | Valor actual de cada portfolio ARS |
| Home — Ganancias por portfolio | ❌ | Nada |
| Lista de portfolios | ✅ | Valor actual del portfolio ARS |
| Detalle de portfolio | ✅ | Valor actual del portfolio ARS |
| Posiciones | ❌ | Nada |
| Detalle de activo | ✅ | Valor actual del activo |
| Transacciones | ❌ | Nada |
| Configuración → Tipo de cambio | ❌ | No corresponde |

---

# 20. Criterios de aceptación

## Home

- [ ] El valor actual global ARS muestra equivalente USD.
- [ ] Las cards de inversión por portfolio ARS muestran equivalente USD.
- [ ] Las cards USD no muestran conversión.
- [ ] Ganancias por portfolio no muestran conversión.
- [ ] El diseño no se vuelve considerablemente más alto.

## Lista de portfolios

- [ ] Los portfolios ARS muestran equivalente USD.
- [ ] Los portfolios USD no muestran conversión.
- [ ] El valor ARS continúa siendo protagonista.
- [ ] No se crean nuevos bloques.

## Detalle de portfolio

- [ ] El resumen del portfolio ARS muestra equivalente USD.
- [ ] El equivalente está debajo del valor principal.
- [ ] Posiciones no cambian su estructura.

## Posiciones

- [ ] No se muestra equivalente USD en las cards de posiciones.

## Detalle de activo

- [ ] El valor actual ARS muestra equivalente USD.
- [ ] El equivalente está inmediatamente debajo.
- [ ] Ganancia y rendimiento permanecen sin cambios.
- [ ] Los datos secundarios permanecen sin cambios.
- [ ] Funciona igual en desktop y mobile.

## Transacciones

- [ ] No se agrega columna USD.
- [ ] No se modifican valores históricos.

## Datos

- [ ] La conversión usa `dollar_quotes.sell`.
- [ ] Solo se muestra para moneda ARS.
- [ ] La fórmula es `valorActualARS / sell`.
- [ ] Si `sell <= 0`, se oculta.
- [ ] Si no hay cotización, se oculta.
- [ ] No se persiste el equivalente.
- [ ] No se consulta DolarAPI desde frontend.

---

# Resultado visual buscado

La aplicación debe seguir sintiéndose exactamente como la actual.

El usuario simplemente encontrará pequeños indicadores secundarios:

```text
ARS 845.400,00
≈ USD 565,48
```

o:

```text
ARS 308.000,00
≈ USD 205,69
```

La regla visual es:

> **Agregar información, no agregar componentes.**

El USD debe sentirse como una referencia contextual que ya estaba disponible, no como una nueva métrica protagonista.

La prioridad de lectura debe mantenerse siempre:

```text
1. Valor principal
2. Ganancia / rendimiento
3. Datos secundarios
4. Equivalencia USD
```
