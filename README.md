# camaraselfie

Interfaz interactiva de **Reconocimiento Facial 3D** con perfilado de consumo algorítmico.

Inspirado en la estética de vigilancia de Trevor Paglen.

## Cómo usar

Abrí `index.html` en tu navegador o ejecutá:
```bash
./run_server.command   # macOS/Linux
run_server.bat         # Windows
```

## Funcionalidades

- **Malla facial 3D** con 16 secciones geométricas (Three.js)
- **Texturización Sobel 3D** — detección de bordes proyectada sobre el rostro
- **Perfilado de consumo** — 11 rasgos + 8 marcas predichas
- **Sliders interactivos**: deriva de cámara, corrupción, deconstrucción, umbral Sobel, tonalidad cromática
- **Captura PNG** del canvas 3D
- **Audio sintetizado** (Web Audio API)
- **HUD táctico** con gráfico de nodos topológicos y stream biométrico

## Tecnologías

- Three.js r128 (CDN)
- Vanilla JS + CSS
- Web Audio API
- Filtro Sobel pixel-por-pixel

## Licencia

MIT