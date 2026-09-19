# Rediseño de Configuración

## Objetivo

Rediseñar la sección **Configuración** de PortfolioWebApp para convertirla en un **hub de navegación hacia configuraciones específicas**, en lugar de mostrar directamente todos los formularios de configuración en una única página.

La página principal de Configuración debe funcionar como un menú de opciones. Cada opción lleva a su propia página específica.

Por ahora solo deben existir:

1. **Tipo de cambio**
2. **Importar / Exportar**

No agregar otras opciones todavía.

---

## 1. Página principal de Configuración

Ruta:

```text
/configuracion
```

La página debe mostrar únicamente opciones navegables.

### Estructura

```text
CONFIGURACIÓN (eyebrow)
Configuración (h1)
Gestioná la configuración de PortfolioWebApp. (subtítulo)

┌──────────────────────────────────────┐
│ [icon $] Tipo de cambio            → │
│          Configurá la cotización del │
│          dólar y otros tipos de      │
│          cambio para convertir       │
│          valores entre ARS y USD.    │
│                                      │
│  [trend-icon] Dólar CCL: $ 1.487,00  │
│               Actualizado:           │
│               19/09/2026 10:24       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ [icon file] Importar / Exportar    → │
│             Exportá tus transacciones│
│             o importá nuevas desde   │
│             un archivo JSON.         │
│                                      │
│  [sync-icon] Exportar en CSV o       │
│              importar desde JSON     │
│              Última exportación:     │
│              15/09/2026              │
└──────────────────────────────────────┘
```

Textos exactos (según mockup de referencia):

- Eyebrow: `CONFIGURACIÓN`
- H1: `Configuración`
- Subtítulo: `Gestioná la configuración de PortfolioWebApp.`
- Card 1 título: `Tipo de cambio`
- Card 1 descripción: `Configurá la cotización del dólar y otros tipos de cambio para convertir valores entre ARS y USD.`
- Card 1 footer línea 1: `Dólar CCL: $ 1.487,00`
- Card 1 footer línea 2: `Actualizado: 19/09/2026 10:24`
- Card 2 título: `Importar / Exportar`
- Card 2 descripción: `Exportá tus transacciones o importá nuevas desde un archivo JSON.`
- Card 2 footer línea 1: `Exportar en CSV o importar desde JSON`
- Card 2 footer línea 2: `Última exportación: 15/09/2026`

> Nota: los valores del footer (`$ 1.487,00`, fechas) son placeholders
> visuales del mockup. No bloquear por ellos la implementación: mostrar
> texto estático con ese formato hasta que exista la fuente real de datos.

En desktop (según mockup web):

- Header card superior (`card card-header`) con eyebrow + h1 + subtítulo.
- Debajo, grilla de 2 columnas (`grid sm:grid-cols-2`) con las 2 cards.
- Cada card (`Link` clickeable completo):
  - Fila superior: icono en contenedor redondeado `accent-soft` (izquierda),
    título + chevron `›`/`→` a la derecha.
  - Debajo: descripción (texto muted, 2-3 líneas).
  - Debajo: pill/footer interno (`card-item` sin hover) con icono + 2 líneas
    (línea 1 semibold, línea 2 muted sutil).
- Toda la card navega a su subruta. El footer interno NO es un link separado.

En mobile (según mockup phone 9:41):

- Navbar colapsado: hamburguesa izquierda, isotipo centrado, toggle tema derecha.
- Mismo header card, apilado a ancho completo.
- Cards una debajo de otra (`grid-cols-1`), ancho completo.
- Dentro de cada card: fila icono + título + chevron arriba,
  descripción en párrafo debajo, footer pill debajo.
- Sin formularios, inputs ni scroll horizontal.

Cada opción debe tener:

- título
- descripción breve
- indicador visual de navegación (`→` o equivalente)
- información contextual mínima cuando corresponda

**No colocar formularios, inputs ni configuraciones editables directamente en `/configuracion`.**

---

## 2. Página específica de Tipo de cambio

Ruta:

```text
/configuracion/tipo-cambio
```

Crear la página y dejarla preparada para futuras funcionalidades.

### Importante

Por ahora debe ser **solamente estructura visual**.

NO implementar todavía:

- APIs
- servicios de cotización
- persistencia
- modelos
- migraciones
- actualización automática
- selección de proveedores
- cálculos de conversión
- lógica para guardar cotizaciones

### Estructura inicial

```text
← Volver

Tipo de cambio
Configurá las cotizaciones utilizadas por PortfolioWebApp.

┌────────────────────────────────────────┐
│ Dólar                                  │
│                                        │
│ Próximamente                           │
│ Configuración de cotizaciones          │
│                                        │
└────────────────────────────────────────┘
```

El placeholder debe ser visualmente coherente con el resto de la aplicación.

La edición/configuración real del dólar se implementará posteriormente.

---

## 3. Página específica de Importar / Exportar

Ruta:

```text
/configuracion/importar-exportar
```

Mover el contenido que actualmente está directamente dentro de Configuración hacia esta página.

**No modificar el comportamiento existente.**

Debe conservar:

### Exportar transacciones

- selección de portfolios
- formato CSV
- botón Exportar
- información sobre cantidad de transacciones

### Importar transacciones

- selección de portfolio destino
- copiar ID
- selección de archivo JSON
- botón Importar
- contenido JSON
- copiar JSON de ejemplo

La funcionalidad actual debe seguir funcionando exactamente igual.

---

## 4. Navegación

La estructura debe quedar:

```text
Configuración
    │
    ├── Tipo de cambio
    │
    └── Importar / Exportar
```

Rutas:

```text
/configuracion
/configuracion/tipo-cambio
/configuracion/importar-exportar
```

Desde `/configuracion`:

```text
Tipo de cambio → /configuracion/tipo-cambio
Importar / Exportar → /configuracion/importar-exportar
```

Cada página específica debe tener una forma clara de volver a `/configuracion`.

No modificar la navegación principal del navbar salvo lo estrictamente necesario.

---

## 5. Responsive

El diseño debe funcionar correctamente en desktop y mobile.

### Desktop

```text
┌──────────────────┐  ┌──────────────────┐
│ Tipo de cambio   │  │ Importar/Exportar│
└──────────────────┘  └──────────────────┘
```

### Mobile

```text
┌─────────────────────────┐
│ Tipo de cambio        → │
└─────────────────────────┘

┌─────────────────────────┐
│ Importar / Exportar   → │
└─────────────────────────┘
```

Las páginas específicas también deben adaptarse correctamente a mobile.

---

## 6. Diseño visual

Utilizar el sistema visual actual de PortfolioWebApp.

### Complemento visual (imagen de referencia web + mobile)

Referencia: mockup con vista desktop (izquierda) y vista mobile iPhone (derecha).

- Fondo página: superficie clara del sistema (`#f5f7fb` en light).
- Header card y option cards: superficie `#ffffff`, borde `#cbd5e1`/`#dbe3ee`,
  radio ~18-22px (usar `.card` existente).
- Icono leading: contenedor cuadrado redondeado (~48px, radio 12-14px) con
  fondo acento suave (`accent-soft`), icono en color acento (`#4f46e5` light /
  `#6366f1` dark):
  - Tipo de cambio: símbolo `$` dentro de círculo (dólar).
  - Importar / Exportar: icono documento con flecha/download.
- Footer pill: contenedor interno con fondo superficie fuerte
  (`#eef2f7` light / `#162033` dark), radio ~12-14px, padding ~12px:
  - Tipo de cambio: icono trend-up + 2 líneas.
  - Importar / Exportar: icono sync/refresh + 2 líneas.
- Chevron: `›` a la derecha del título, color muted, `aria-hidden`.
- Tipografía: título card ~16-18px semibold, descripción ~14px muted,
  footer línea 1 ~13-14px semibold, línea 2 ~12px sutil.
- Toda la card es el área clickeable (`<Link>`), con hover en borde
  (`border-hover`) y focus-visible con anillo indigo del sistema.

### Light Mode — Slate & Indigo

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
```

### Dark Mode — Dark Slate & Indigo

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
Ganancia:           #10b981
Pérdida:            #f43f5e
```

Las nuevas páginas deben utilizar los tokens existentes.

**No crear colores nuevos directamente dentro de los componentes si existe un design token equivalente.**

---

## 7. Regla de arquitectura

La página:

```text
/configuracion
```

debe ser exclusivamente un **punto de entrada/navegación**.

No convertirla nuevamente en una página larga con todos los formularios.

La regla conceptual es:

```text
/configuracion
       ↓
menú de opciones
       ↓
configuración específica
```

Esto permitirá agregar futuras secciones sin modificar la estructura principal:

```text
Configuración
├── Tipo de cambio
├── Importar / Exportar
├── Fuentes de precios       ← futuro
├── Preferencias             ← futuro
└── ...
```

**No implementar las opciones futuras ahora.**

---

## 8. Revisión previa antes de modificar código

Antes de implementar:

1. Revisar la arquitectura actual del proyecto.
2. Localizar la ruta actual de Configuración.
3. Localizar la página/componente actual de Configuración.
4. Identificar los componentes actuales de importación/exportación.
5. Revisar el sistema de routing.
6. Revisar el sistema de temas/tokens.
7. Identificar componentes reutilizables de:
   - cards
   - botones
   - navegación
   - inputs
   - layouts
8. Reutilizar componentes existentes siempre que sea posible.
9. Evitar duplicar componentes o crear estilos paralelos.

---

## 9. Restricciones

No:

- implementar todavía la lógica del dólar
- crear APIs
- crear modelos
- crear migraciones
- modificar el cálculo de portfolios
- modificar la funcionalidad de importación/exportación
- agregar nuevas opciones de Configuración
- modificar otras secciones de la aplicación
- cambiar el sistema de temas
- introducir nuevos colores innecesariamente
- rediseñar el navbar principal

Solo modificar lo estrictamente necesario para implementar esta nueva estructura.

---

## 10. Criterios de finalización

El trabajo estará terminado cuando:

- [ ] `/configuracion` sea únicamente un menú de opciones.
- [ ] Exista la opción **Tipo de cambio**.
- [ ] Exista la opción **Importar / Exportar**.
- [ ] Ambas opciones sean navegables.
- [ ] `/configuracion/tipo-cambio` exista.
- [ ] La página Tipo de cambio sea visualmente consistente y funcione como placeholder.
- [ ] No exista todavía lógica de cotización.
- [ ] `/configuracion/importar-exportar` contenga la funcionalidad actual.
- [ ] La importación/exportación siga funcionando exactamente igual.
- [ ] Desktop esté correctamente adaptado.
- [ ] Mobile esté correctamente adaptado.
- [ ] Light Mode respete los tokens existentes.
- [ ] Dark Mode respete los tokens existentes.
- [ ] Cada página específica tenga una navegación clara de regreso a Configuración.
- [ ] No se hayan agregado opciones futuras.
- [ ] No se haya modificado funcionalidad fuera de Configuración salvo lo estrictamente necesario.

---

## Resultado esperado

La experiencia final debe ser:

```text
Configuración
│
├── Tipo de cambio
│      └── Página específica
│
└── Importar / Exportar
       └── Página específica
```

La página principal funciona como **índice de configuraciones**, mientras que cada configuración vive en su propia página.

El diseño debe sentirse limpio, compacto, escalable y consistente con PortfolioWebApp.
