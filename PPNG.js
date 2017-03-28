

var PPNG = {};

PPNG.toRGBA8 = function(out)
{
	var area = out.width*out.height;
	var bf = new Uint8Array(area*4), data = out.data, ctype = out.ctype;
	
	if     (ctype==6) {
		var qarea = area<<2;
		for(var i=0; i<qarea;i++) {  bf[i] = data[i];  }
	}
	else if(ctype==2) {
		for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*3;  bf[qi] = data[ti];  bf[qi+1] = data[ti+1];  bf[qi+2] = data[ti+2];  bf[qi+3] = 255;  }
	}
	else if(ctype==3) {
		var plt = out.tabs["PLTE"], tplt = out.tabs["tRNS"], tl = tplt?tplt.length:0;
		for(var i=0; i<area; i++) {  var qi=i<<2, j=data[i], cj=3*j;  bf[qi]=plt[cj];  bf[qi+1]=plt[cj+1];  bf[qi+2]=plt[cj+2];  bf[qi+3]=(j<tl)?tplt[j]:255;  }
	}
	else if(ctype==4) {
		for(var i=0; i<area; i++) {  var qi=i<<2, di=i<<1, gr=data[di];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=data[di+1];  }
	}
	else if(ctype==0) {
		for(var i=0; i<area; i++) {  var qi=i<<2, gr=data[i];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=255;  }
	}
	else console.log("unsupported color type", ctype);
	return bf;
}

PPNG.decode = function(buff)
{
	var data = new Uint8Array(buff), offset = 8, bin = PPNG._bin;
	var out = {tabs:{}};
	
	var dd = new Uint8Array(data.length), doff = 0;	 // put all IDAT data into it
	
	while(true)
	{
		var len = bin.readUint(data, offset);  offset += 4;
		var type = bin.readASCII(data, offset, 4);  offset += 4;
		//console.log(len, type);
		
		if     (type=="IHDR")  PPNG.decode._IHDR(data, offset, out);
		else if(type=="IDAT") {
			for(var i=0; i<len; i++) dd[doff+i] = data[offset+i];
			doff += len;
		}
		else if(type=="pHYs") {
			out.tabs[type] = [bin.readUint(data, offset), bin.readUint(data, offset+4), data[offset+8]];
		}
		else if(type=="cHRM") {
			out.tabs[type] = [];
			for(var i=0; i<8; i++) out.tabs[type].push(bin.readUint(data, offset+i*4));
		}
		else if(type=="tEXt") {
			if(out.tabs[type]==null) out.tabs[type] = {};
			var nz = bin.nextZero(data, offset);
			var keyw = bin.readASCII(data, offset, nz-offset);
			var text = bin.readASCII(data, nz+1, offset+len-nz-1);
			out.tabs[type][keyw] = text;
		}
		else if(type=="iTXt") {
			if(out.tabs[type]==null) out.tabs[type] = {};
			var nz = 0, off = offset;
			nz = bin.nextZero(data, off);
			var keyw = bin.readASCII(data, off, nz-off);  off = nz + 1;
			var cflag = data[off], cmeth = data[off+1];  off+=2;
			nz = bin.nextZero(data, off);
			var ltag = bin.readASCII(data, off, nz-off);  off = nz + 1;
			nz = bin.nextZero(data, off);
			var tkeyw = bin.readUTF8(data, off, nz-off);  off = nz + 1;
			var text = bin.readUTF8(data, off, len-(off-offset));
			out.tabs[type][keyw] = text;
		}
		else if(type=="PLTE") {
			out.tabs[type] = bin.readBytes(data, offset, len);
		}
		else if(type=="hIST") {
			var pl = out.tabs["PLTE"].length/3;
			out.tabs[type] = [];  for(var i=0; i<pl; i++) out.tabs[type].push(bin.readUshort(data, offset+i*2));
		}
		else if(type=="tRNS") {
			if(out.ctype!=3) console.log("transparency for unsupported color type",out.ctype);
			out.tabs[type] = bin.readBytes(data, offset, len);
		}
		else if(type=="gAMA") out.tabs[type] = bin.readUint(data, offset)/100000;
		else if(type=="sRGB") out.tabs[type] = data[offset];
		else if(type=="bKGD") 
		{
			if     (out.ctype==0 || out.ctype==4) out.tabs[type] = [bin.readUshort(data, offset)];
			else if(out.ctype==2 || out.ctype==6) out.tabs[type] = [bin.readUshort(data, offset), bin.readUshort(data, offset+2), bin.readUshort(data, offset+4)];
			else console.log("unknown color type", out.ctype);
		}
		else if(type=="IEND") {
			if(out.compress ==0) dd = PPNG.decode._inflate(dd);
			else console.log("unsupported compression method:", out.interlace);
			
			if(out.filter!=0) console.log("unsupported filter method:", out.filter);
			
			if(out.interlace==0) out.data = PPNG.decode._filterZero(dd, out, 0, out.width, out.height);
			else if(out.interlace==1) out.data = PPNG.decode._readInterlace(dd, out);
			else console.log("unsupported interlace method:", out.interlace);
			
			break;
		}
		else console.log("unknown type", type, len);
		offset += len;
		var crc = bin.readUint(data, offset);  offset += 4;
	}
	delete out.compress;  delete out.interlace;  delete out.filter;
	return out;
}

PPNG.decode._inflate = function(data) {  return pako["inflate"](data);  }

PPNG.decode._readInterlace = function(data, out)
{
	var width = out.width, height = out.height;
	
	var bpp = PPNG.decode._getBPP(out);
	var img = new Uint8Array( width * height * bpp );
	var di = 0;
	
	var starting_row  = [ 0, 0, 4, 0, 2, 0, 1 ];
	var starting_col  = [ 0, 4, 0, 2, 0, 1, 0 ];
	var row_increment = [ 8, 8, 8, 4, 4, 2, 2 ];
	var col_increment = [ 8, 8, 4, 4, 2, 2, 1 ];

	var pass=0, row=0, col=0;
	
	while (pass < 7)
	{
		row = starting_row[pass];
		var ri = row_increment[pass], ci = col_increment[pass];
		var sw = 0, sh = 0;
		var cr = starting_row[pass];  while(cr<height) {  cr+=ri;  sh++;  }
		var cc = starting_col[pass];  while(cc<width ) {  cc+=ci;  sw++;  }
		PPNG.decode._filterZero(data, out, di, sw, sh);
		var cdi = di;
		
		while (row < height)
		{
			col = starting_col[pass];
			while (col < width)
			{
				var ii = (row * width + col) * bpp;
				for(var j=0; j<bpp; j++) img[ii+j] = data[cdi+j];
				cdi+=bpp;
				col += ci;
			}
			row += ri;
		}
		if(sw*sh!=0) di += sh * ( 1 + sw * bpp);
		pass = pass + 1;
	}
	return img;
}

PPNG.decode._getBPP = function(out)
{
	if(out.depth!=8) console.log("Unsupported bit depth", out.depth);
	var bpp = 0, ctype = out.ctype;
	if     (ctype==0) bpp = 1;
	else if(ctype==2) bpp = 3;
	else if(ctype==3) bpp = 1;
	else if(ctype==4) bpp = 2;
	else if(ctype==6) bpp = 4;
	else console.log("unsupported color type", ctype);
	return bpp;
}

PPNG.decode._filterZero = function(data, out, off, w, h)
{	
	var bpp = PPNG.decode._getBPP(out), bpl = bpp * w;
	
	for(var y=0; y<h; y++)
	{
		var i = off+y*bpl, di = i+y+1;
		var type = data[di-1];
		
		if    (type==0) for(var x=  0; x<bpl; x++) data[i+x] = data[di+x];
		else {  
			if(type==1) for(var x=  0; x<bpp; x++) data[i+x] = data[di+x];  
			if(type==2) for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x]+data[i+x-bpl])&255;  
			if(type==3) for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x]+(data[i+x-bpl]>>>1))&255;  
			if(type==4) for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x]+PPNG.decode._paeth(0, data[i+x-bpl], 0))&255;  
			
			if(type==1) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpp])&255;
			if(type==2) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpl])&255;
			if(type==3) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + ((data[i+x-bpl]+data[i+x-bpp])>>>1) )&255;
			if(type==4) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + PPNG.decode._paeth(data[i+x-bpp], data[i+x-bpl], data[i+x-bpp-bpl]) )&255;
		}
		if(type>4) console.log("unknown filter type", type, y);
	}
	return data;
}

PPNG.decode._paeth = function(a,b,c)
{
	var p = a+b-c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c), Pr = 0;
    if (pa <= pb && pa <= pc)  Pr = a;
    else if (pb <= pc)  Pr = b;
    else Pr = c;
    return Pr;
}

PPNG.decode._IHDR = function(data, offset, out)
{
	var bin = PPNG._bin;
	out.width  = bin.readUint(data, offset);  offset += 4;
	out.height = bin.readUint(data, offset);  offset += 4;
	out.depth = data[offset];  offset++;
	out.ctype = data[offset];  offset++;
	out.compress  = data[offset];  offset++;
	out.filter    = data[offset];  offset++;
	out.interlace = data[offset];  offset++;
}




PPNG._bin = {
	nextZero   : function(data, o) {  while(data[o]!=0) o++;  return o;  },
	readUshort : function(buff, p) {  return (buff[p]<< 8) | buff[p+1];  },
	readUint   : function(buff, p) {  return (buff[p]<<24) | (buff[p+1]<<16) | (buff[p+2]<< 8) | buff[p+3];  },
	readASCII  : function(buff, p, l)
	{
		var s = "";
		for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);
		return s;
	},
	pad : function(n) { return n.length < 2 ? "0" + n : n; },
	readUTF8 : function(buff, p, l)
	{
		var s = "";
		for(var i=0; i<l; i++) s += "%" + PPNG._bin.pad(buff[p+i].toString(16));
		return decodeURIComponent(s);
	},
	readBytes : function(buff, p, l)
	{
		var arr = [];
		for(var i=0; i<l; i++) arr.push(buff[p+i]);
		return arr;
	}
}