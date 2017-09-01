# UPNG.js
A small, fast and advanced PNG encoder and decoder. It is the main PNG engine for [Photopea image editor](https://www.photopea.com).

* [Examples of PNGs minified by UPNG.js](https://blog.photopea.com/png-minifier-inside-photopea.html#examples)
* [Try UPNG.js in Photopea](https://www.photopea.com) - open an image and press File - Save for web, play with the Quality
* [UPNG.Photopea.com](http://upng.photopea.com) - a separate minifier app, that uses UPNG.js
* Support us by [making a donation](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=ivan%2ekuckir%40gmail%2ecom&lc=CZ&item_name=UPNG%2ejs&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted).

Download and include the `UPNG.js` file in your code, or get it from NPM:

```sh
npm install upng-js
```

## Encoder

#### `UPNG.encode(rgba, w, h, cnum)`
* `rgba`: ArrayBuffer containing the pixel data (RGBA, 8 bits per channel)
* `w`, `h` : width and height of the image
* `cnum`: number of colors in the result;  0: all colors (lossless PNG)
* returns an ArrayBuffer with binary data of a PNG file

UPNG.js can do a lossy minification of PNG files, similar to [TinyPNG](https://tinypng.com/) and other tools. It performs color quantization using the [k-means algorithm](https://en.wikipedia.org/wiki/K-means_clustering).

Lossy compression is allowed by the last parameter `cnum`. Set it to zero for a lossless compression, or write the number of allowed colors in the image. Smaller values produce smaller files. **Or just use 0 for lossless / 256 for lossy.**

## Decoder

Supports all color types (including Grayscale and Palettes), all channel depths (1, 2, 4, 8, 16), interlaced images etc. Opens PNGs which other libraries can not open (tested with [PngSuite](http://www.schaik.com/pngsuite/)).

#### `UPNG.decode(buffer)`
* `buffer`: ArrayBuffer containing the PNG file
* returns an image object with following properties:
* * `width`: the width of the image
* * `height`: the height of the image
* * `depth`: number of bits per channel
* * `ctype`: color type of the file (Truecolor, Grayscale, Palette ...)
* * `tabs`: additional chunks of the PNG file
* * `data`: pixel data of the image

PNG files may have a various number of channels and a various color depth. The interpretation of `data` depends on the current color type and color depth (see the [PNG specification](https://www.w3.org/TR/PNG/)).

#### `UPNG.toRGBA8(img)`
* `img`: PNG image object (returned by UPNG.decode())
* returns Uint8Array of the image in RGBA format, 8 bits per channel (ready to use in ctx.putImageData() etc.)

### Example
    var img  = UPNG.decode(buff);         // put ArrayBuffer into UPNG.decode
    var rgba = UPNG.toRGBA8(img).buffer;  // UPNG.toRGBA8 returns Uint8Array, size: width * height * 4 bytes.

PNG format uses the Inflate algorithm. Right now, UPNG.js calls [Pako.js](https://github.com/nodeca/pako) for the Inflate and Deflate method.
