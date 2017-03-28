# PPNG.js
PPNG.js is a small, fast and advanced PNG decoder. It is the main PNG decoder for [Photopea image editor](https://www.photopea.com).

* Supports all color types (including Grayscale and Palettes)
* Supports interlaced images

#### `PPNG.decode(buffer)`
* `buffer`: ArrayBuffer containing the PNG file
* returns an image object with following properties:
* * `width`: the width of the image
* * `height`: the height of the image
* * `depth`: number of bits per channel
* * `ctype`: color type of the file (Truecolor, Grayscale, Palette ...)
* * `tabs`: additional chunks of the PNG file
* * `data`: pixel data of the image

PNG files may have different number of channels and different color depth. The interpretation of `data` depends on the current color type and color depth (see the [PNG specification](https://www.w3.org/TR/PNG/)).

#### `PPNG.toRGBA8(img)`
* `img`: PNG image object (returned by PPNG.decode())
* returns a Uint8Array of the image in a RGBA format, 8 bits per channel (ready to use in canvas2Dcontext.putImageData() etc.)

PNG format uses the Inflate algorithm. Right now, it calls [Pako.js library](https://github.com/nodeca/pako) for the Inflate method. To remove this dependency, rewrite PPNG.decode._inflate() method.
