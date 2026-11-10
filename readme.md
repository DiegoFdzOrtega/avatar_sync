# AvatarSync

**Interfaz natural de usuario:** un personaje anime que se controla con la cara, las manos, el cuerpo y la voz. No hace falta ratón ni teclado.

**Demo:** https://DiegoFdzOrtega.github.io/avatar_sync/

Alumno: **Diego Fernández Ortega** · 2.º DAM · Tame Formación
Módulo **0488 Desarrollo de interfaces** · Resultado de aprendizaje 2: *Genera interfaces naturales de usuario utilizando herramientas visuales.*

---

## Qué hace

| Entrada natural | Qué detecta | Qué pasa en la interfaz |
|---|---|---|
| 🙂 **Cara** | Giro, inclinación y ladeo de la cabeza | El personaje gira, sube, baja y ladea la cabeza igual que tú |
| 👁️ **Ojos** | Si parpadeas o guiñas un ojo | El personaje parpadea contigo. Un guiño lanza estrellas |
| 👄 **Boca** | Apertura y forma (a, o, i) y sonrisa | El personaje vocaliza. Una sonrisa grande lanza corazones |
| ✋ **Manos** | Mano abierta, pulgar arriba, paz y puño | Saludo, «¡GENIAL!», cambio de fondo y «¡PUM!» con temblor |
| 🙌 **Cuerpo** | Brazos levantados y desplazamiento lateral | Aura de poder y el personaje se mueve a los lados |
| 🎤 **Voz** | Palabras en español | Comandos: calibrar, máscara, fondo, foto, hola, poder, brillos… |
| 🎭 **Realidad aumentada** | Posición, tamaño y ladeo de tu cara | La cabeza del personaje se pinta sobre tu cara en el vídeo y te sigue |
| 🚪 Salir de la cámara | No hay cara | El personaje se da la vuelta (se le ve la nuca) |
| 👆 **Cursor con la mano** | Punta del dedo índice y pellizco (pulgar + índice) | Manejas **la propia página** sin ratón: mueves un cursor, haces clic en botones y casillas y arrastras deslizadores |
| 🗣️ **El personaje habla** | — (síntesis de voz) | Responde en voz alta («hola», «quién eres», «chiste», «ayuda»…) y mueve la boca mientras habla |
| ⭐ **Minijuego AR** | Puntas de los 5 dedos de cada mano | Caen estrellas y bombas sobre tu vídeo: atrápalas con los dedos en 30 segundos. Se guarda el récord |
| 📸🎬 **Foto y vídeo** | — | Guarda una imagen o graba un vídeo `.webm` con la realidad aumentada, el personaje y el sonido |

### La interfaz

- **Portada** sobre la cámara con el botón para empezar, que desaparece al iniciar.
- **Indicadores** arriba (cara, manos, cuerpo, voz y realidad aumentada), que se encienden en verde cuando detectan algo.
- **Barra de herramientas** agrupada en *Entrada*, *Realidad aumentada* y *Capturar*.
- **Medidores en vivo** del giro, la inclinación y el ladeo de la cabeza, de cada ojo, de la boca y de la sonrisa, para ver qué está midiendo el modelo.
- **Comandos de voz pulsables**: se pueden probar sin micrófono; con el cursor con la mano, también sin ratón.
- **Registro** de todo lo detectado, con la hora.
- **Ajustes plegables** agrupados en Cabeza, Boca y Realidad aumentada; se guardan solos.
- Diseño adaptable a móvil, foco visible con el teclado y respeto a la opción del sistema *reducir movimiento*.

---

## Criterios de evaluación

| Criterio | Cómo se cumple | Dónde verlo |
|---|---|---|
| **a)** Se han identificado las herramientas disponibles para el aprendizaje automático relacionadas con las interfaces de usuario. | Comparativa de herramientas de aprendizaje automático (MediaPipe, TensorFlow.js, ml5.js, face-api.js, OpenCV, Web Speech API, WebXR…) con su uso y el motivo de la elección. | Apartado [Herramientas de aprendizaje automático](#herramientas-de-aprendizaje-automático) |
| **b)** Se ha creado una interfaz natural de usuario utilizando las herramientas disponibles. | Toda la aplicación se maneja con el cuerpo y la voz. Usa tres modelos de MediaPipe (cara, manos y cuerpo) y la Web Speech API. Con el **cursor con la mano** se pueden pulsar los botones y mover los deslizadores de la propia interfaz sin tocar el ratón. | `index.html`, `app.js` (secciones 5 y 12) |
| **c)** Se ha utilizado el reconocimiento de voz para implementar acciones en las interfaces naturales de usuario. | La Web Speech API reconoce frases en español y ejecuta 16 comandos (máscara, juego, cursor, foto, grabar, parar, fondo, hola, chiste, ayuda…). La página muestra lo que ha oído. Además, el personaje **contesta hablando** (síntesis de voz) y mueve la boca mientras habla. Mientras habla, no se escucha a sí mismo. | `app.js` sección 3 · botón **🎤 Activar voz** |
| **d)** Se ha incorporado la detección del movimiento del cuerpo para implementar acciones en las interfaces naturales de usuario. | Pose Landmarker detecta 33 puntos del cuerpo. Con los brazos arriba se activa el aura de poder; al moverte a los lados, el personaje se desplaza. También se detectan los movimientos de la cabeza (girar, subir, bajar y ladear). | `app.js` secciones 5 y 6 (cuerpo) |
| **e)** Se han integrado elementos de detección de partes del cuerpo para implementar acciones en las interfaces naturales de usuario. | **Cara** (478 puntos y 52 expresiones): ojos, boca, guiño y sonrisa. **Manos** (21 puntos por mano): 4 gestos, el cursor con el dedo índice, el pellizco para hacer clic y las puntas de los dedos para atrapar estrellas en el juego. | `app.js` secciones 1, 2, 6, 12 y 13 |
| **f)** Se ha integrado la realidad aumentada en los interfaces de usuario. | Botón **🎭 Máscara AR** o comando de voz «máscara»: la cabeza del personaje se dibuja encima de tu cara en el vídeo real y sigue su posición, tamaño y ladeo. Encima del vídeo se dibujan también los puntos de la cara y los esqueletos de las manos y del cuerpo. El **minijuego** pone objetos virtuales en tu vídeo que interactúan con tus manos reales. Con «foto» y «grabar» se guarda el resultado. | `app.js` secciones 9, 10 y 13 |

---

## Herramientas de aprendizaje automático

El **aprendizaje automático** (*machine learning*) consiste en que un programa aprende a reconocer algo (una cara, una mano, una palabra) a partir de muchos ejemplos, en vez de programar las reglas a mano. Para interfaces naturales se usan **modelos ya entrenados**: tú le das una imagen de la cámara y el modelo te devuelve dónde están los puntos de la cara, de las manos o del cuerpo.

| Herramienta | Qué hace | ¿La uso? | Por qué |
|---|---|---|---|
| **MediaPipe Tasks Vision** (Google) | Modelos para cara (Face Landmarker), manos (Hand Landmarker), cuerpo (Pose Landmarker), gestos y segmentación. Funciona en el navegador con WebAssembly y GPU | ✅ **Sí** | Es la más completa, va en tiempo real en el navegador y da las **expresiones** de la cara (ojos, boca, sonrisa) ya calculadas |
| **Web Speech API** | Reconocimiento de voz integrado en Chrome y Edge | ✅ **Sí** | No hay que instalar nada y reconoce español |
| **Speech Synthesis API** | Convierte texto en voz (el navegador habla) | ✅ **Sí** | Para que el personaje conteste en voz alta |
| **Web Audio API** | Analiza el sonido del micrófono (volumen) y genera sonidos | ✅ Sí | Sonidos del minijuego y modo antiguo de mover la boca según el volumen |
| **TensorFlow.js** | Librería general para ejecutar modelos en el navegador (MoveNet, BlazePose, FaceMesh…) | ❌ No | Sirve para lo mismo, pero hay que montar más piezas a mano. MediaPipe ya trae los tres modelos listos |
| **ml5.js** | Capa sencilla sobre TensorFlow.js pensada para aprender | ❌ No | Muy fácil de usar, pero da menos control y no tiene expresiones faciales |
| **face-api.js** | Detección y reconocimiento de caras | ❌ No | Sin mantenimiento desde hace años y no detecta manos ni cuerpo |
| **OpenCV** (Python / OpenCV.js) | Visión por ordenador clásica | ❌ No | Muy potente, pero la detección de puntos del cuerpo hay que añadirla aparte |
| **Teachable Machine** (Google) | Entrenar tu propio modelo con ejemplos desde la web | ❌ No | Útil para gestos personalizados, pero los gestos de esta app se reconocen bien con reglas sobre los puntos de la mano |
| **Vosk / Whisper** | Reconocimiento de voz que funciona sin conexión | ❌ No | Más preciso y privado, pero mucho más pesado para una página web |
| **WebXR / AR.js / MindAR** | Realidad aumentada con gafas, móvil o marcadores impresos | ❌ No | Pensados para 3D o marcadores. Para poner una máscara en la cara basta con un canvas encima del vídeo y los puntos de MediaPipe |

---

## Cómo probarlo

1. Abre la [demo](https://DiegoFdzOrtega.github.io/avatar_sync/), o la carpeta con **Live Server** en VS Code. Con doble clic en el `index.html` también funciona, pero la voz y la foto necesitan que la página se abra desde un servidor.
2. Usa **Chrome o Edge** (son los navegadores que tienen reconocimiento de voz). Hace falta conexión a Internet para descargar los modelos.
3. Pulsa **📷 Iniciar cámara** y acepta los permisos de cámara y micrófono.
4. Mírate de frente 2 segundos para que se calibre.
5. Prueba a mover la cabeza, parpadear, abrir la boca, hacer gestos con las manos y levantar los brazos.
6. Pulsa **🎤 Activar voz** y di, por ejemplo, «hola», «máscara», «juego» o «chiste».
7. Prueba **👆 Cursor con la mano**: apunta con el dedo índice y junta el pulgar y el índice para hacer clic.
8. Graba una demo con **⏺ Grabar** (o diciendo «grabar» y luego «parar»).

### Comandos de voz

| Di… | Acción |
|---|---|
| «hola» | El personaje te saluda en voz alta |
| «quién eres» | El personaje se presenta |
| «chiste» | El personaje cuenta un chiste |
| «ayuda» | El personaje te dice qué puedes decir |
| «juego» / «jugar» | Empieza el minijuego de atrapar estrellas |
| «cursor» | Activa o quita el cursor con la mano |
| «grabar» | Empieza o para la grabación de vídeo |
| «parar» | Para la grabación o el juego |
| «calibrar» | Recalibra la posición neutra de la cabeza |
| «máscara» / «realidad aumentada» | Activa o quita la máscara de realidad aumentada |
| «fondo» | Cambia el fondo del personaje |
| «foto» / «captura» | Guarda una imagen del vídeo y del personaje |
| «poder» / «energía» | Aura de energía y «¡PODER!» |
| «brillos» / «magia» | Lluvia de brillos |
| «puntos» | Muestra u oculta los puntos y esqueletos |
| «efectos» | Activa o desactiva los efectos visuales |

### Gestos

| Gesto | Acción |
|---|---|
| ✋ Mano abierta | El personaje dice «¡Hola!» |
| 👍 Pulgar arriba | «¡GENIAL!» y brillos |
| ✌️ Paz | Cambia el fondo |
| ✊ Puño | «¡PUM!» y temblor |
| 😉 Guiño | Estrellas |
| 😄 Sonrisa grande | Corazones |
| 🙌 Brazos arriba | Aura de poder mientras los mantengas |
| 👆 Índice (modo cursor) | Mueve el cursor por la página |
| 🤏 Pellizco (modo cursor) | Clic en botones y casillas; mantenido sobre un deslizador, lo arrastra |
| 🖐️ Dedos (juego) | Atrapan estrellas (+1) y bombas (−2) |

Para que un gesto cuente tiene que mantenerse unos instantes (6 detecciones seguidas). Después espera casi 2 segundos antes de poder repetirse, para evitar que se active sin querer. En el modo cursor y en el juego los gestos se desactivan, para que no se mezclen.

---

## Cómo funciona por dentro

- **`index.html`**: la página: vídeo con una capa de dibujo encima (realidad aumentada), lienzo del personaje, indicadores, registro y ajustes.
- **`app.js`**: organizado en secciones numeradas:
  1. **Cara**: calcula el giro, la inclinación y el ladeo a partir de los puntos de los ojos, la nariz y la barbilla.
  2. **Manos**: decide qué dedos están estirados (si la punta está más lejos de la muñeca que la articulación del medio) y, con eso, qué gesto haces.
  3. **Voz**: la Web Speech API escucha de forma continua, quita las tildes y busca palabras clave.
  4. **Efectos**: partículas, textos de impacto estilo manga, bocadillo, aura y temblor.
  5. **Detección**: carga los tres modelos de MediaPipe (en la GPU si se puede). Analiza la cara en cada fotograma y alterna manos y cuerpo para que vaya fluido.
  6. **Estado del personaje**: convierte lo detectado en movimientos suavizados y en gestos.
  7. **Micrófono**: modo opcional para mover la boca con el volumen.
  8. **Dibujo del personaje**: mezcla las 4 imágenes más cercanas de la hoja de sprites para que el giro sea suave, y añade la boca y los ojos.
  9. **Realidad aumentada**: dibuja la cabeza del personaje sobre tu cara en el vídeo, con su tamaño y su ángulo.
  10. **Foto y vídeo**: junta el vídeo, la capa de realidad aumentada y el personaje en una imagen PNG o en un vídeo WebM grabado con MediaRecorder.
  11. *(dentro de la sección 3)* **Síntesis de voz**: `decir()` lee el texto en voz alta, lo muestra en un bocadillo y mueve la boca del personaje.
  12. **Cursor con la mano**: convierte la posición del dedo índice en coordenadas de la ventana y, con `document.elementFromPoint`, sabe qué botón hay debajo. El pellizco tiene histéresis (se pulsa por debajo de 0,33 y se suelta por encima de 0,5) para que no haga clics dobles.
  13. **Minijuego**: crea estrellas y bombas que caen cada vez más rápido y comprueba si alguna punta de dedo las toca.
  14. **Bucle de dibujo** y 15. **Arranque**.
- **Ajustes guardados**: los deslizadores y casillas se guardan en `localStorage` (el almacenamiento del navegador), igual que el récord del juego. El botón «Restablecer ajustes» los borra.
- **Rendimiento**: la cara se analiza en cada fotograma, y las manos y el cuerpo por turnos. En el juego y con el cursor, las manos pasan a ir en cada fotograma. Debajo del vídeo se ve cuántas detecciones por segundo consigue tu equipo.
- **Imágenes**: `spritesheet_sin_fondo.png` (5 × 5 posiciones de la cabeza; la última fila es la nuca), `hablar.png` (bocas cerrada, a, o, i) y `ojos_cerrados.png`.

## Tecnologías

- HTML5, CSS3 y JavaScript sin frameworks
- Canvas 2D
- MediaPipe Tasks Vision 0.10.14 (Face, Hand y Pose Landmarker)
- Web Speech API (reconocimiento de voz) y Speech Synthesis API (voz del personaje)
- Web Audio API (volumen del micro y sonidos del juego)
- MediaRecorder (grabación de vídeo) y localStorage (ajustes y récord)
- getUserMedia (cámara y micrófono)
