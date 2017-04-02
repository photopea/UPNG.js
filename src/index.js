var UPNG = {};

UPNG.toRGBA8 = function(out)
{
	//console.log(out.ctype, out.depth);
	var w = out.width, h = out.height, area = w*h, bpp = UPNG.decode._getBPP(out);
	var bpl = Math.ceil(w*bpp/8);	// bytes per line

	var bf = new Uint8Array(area*4), bf32 = new Uint32Array(bf.buffer);
	var data = out.data, ctype = out.ctype, depth = out.depth;
	var rs = UPNG._bin.readUshort;

	if     (ctype==6) { // RGB + alpha
		var qarea = area<<2;
		if(depth== 8) for(var i=0; i<qarea;i++) {  bf[i] = data[i];  /*if((i&3)==3) bf[i]=255;*/  }
		if(depth==16) for(var i=0; i<qarea;i++) {  bf[i] = data[i<<1];  }
	}
	else if(ctype==2) {	// RGB
		var ts=out.tabs["tRNS"], tr=-1, tg=-1, tb=-1;
		if(ts) {  tr=ts[0];  tg=ts[1];  tb=ts[2];  }
		if(depth== 8) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*3;  bf[qi] = data[ti];  bf[qi+1] = data[ti+1];  bf[qi+2] = data[ti+2];  bf[qi+3] = 255;
			if(tr!=-1 && data[ti]   ==tr && data[ti+1]   ==tg && data[ti+2]   ==tb) bf[qi+3] = 0;  }
		if(depth==16) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*6;  bf[qi] = data[ti];  bf[qi+1] = data[ti+2];  bf[qi+2] = data[ti+4];  bf[qi+3] = 255;
			if(tr!=-1 && rs(data,ti)==tr && rs(data,ti+2)==tg && rs(data,ti+4)==tb) bf[qi+3] = 0;  }
	}
	else if(ctype==3) {	// palette
		var p=out.tabs["PLTE"], ap=out.tabs["tRNS"], tl=ap?ap.length:0;
		if(depth==1) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>3)]>>(7-((i&7)<<0)))& 1), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;   }
		}
		if(depth==2) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>2)]>>(6-((i&3)<<1)))& 3), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;   }
		}
		if(depth==4) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>1)]>>(4-((i&1)<<2)))&15), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;   }
		}
		if(depth==8) for(var i=0; i<area; i++ ) {  var qi=i<<2, j=data[i]                      , cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
	}
	else if(ctype==4) {	// gray + alpha
		if(depth== 8)  for(var i=0; i<area; i++) {  var qi=i<<2, di=i<<1, gr=data[di];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=data[di+1];  }
		if(depth==16)  for(var i=0; i<area; i++) {  var qi=i<<2, di=i<<2, gr=data[di];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=data[di+2];  }
	}
	else if(ctype==0) {	// gray
		var tr = out.tabs["tRNS"] ? out.tabs["tRNS"] : -1;
		if(depth== 1) for(var i=0; i<area; i++) {  var qi=i<<2, gr=255*((data[i>>3]>>(7 -((i&7)   )))& 1), al=(gr==tr*255)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
		if(depth== 2) for(var i=0; i<area; i++) {  var qi=i<<2, gr= 85*((data[i>>2]>>(6 -((i&3)<<1)))& 3), al=(gr==tr* 85)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
		if(depth== 4) for(var i=0; i<area; i++) {  var qi=i<<2, gr= 17*((data[i>>1]>>(4 -((i&1)<<2)))&15), al=(gr==tr* 17)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
		if(depth== 8) for(var i=0; i<area; i++) {  var qi=i<<2, gr=data[i  ] , al=(gr           ==tr)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
		if(depth==16) for(var i=0; i<area; i++) {  var qi=i<<2, gr=data[i<<1], al=(rs(data,i<<1)==tr)?0:255;  bf32[i]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
	}
	else console.log("unsupported color type", ctype);
	return bf;
}

UPNG.decode = function(buff)
{
	var data = new Uint8Array(buff), offset = 8, bin = UPNG._bin;
	var out = {tabs:{}};

	var dd = new Uint8Array(data.length), doff = 0;	 // put all IDAT data into it

	while(true)
	{
		var len = bin.readUint(data, offset);  offset += 4;
		var type = bin.readASCII(data, offset, 4);  offset += 4;
		//console.log(len, type);

		if     (type=="IHDR")  UPNG.decode._IHDR(data, offset, out);
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
			if     (out.ctype==3) out.tabs[type] = bin.readBytes(data, offset, len);
			else if(out.ctype==0) out.tabs[type] = bin.readUshort(data, offset);
			else if(out.ctype==2) out.tabs[type] = [ bin.readUshort(data,offset),bin.readUshort(data,offset+2),bin.readUshort(data,offset+4) ];
			else console.log("tRNS for unsupported color type",out.ctype, len);
		}
		else if(type=="gAMA") out.tabs[type] = bin.readUint(data, offset)/100000;
		else if(type=="sRGB") out.tabs[type] = data[offset];
		else if(type=="bKGD")
		{
			var rs = bin.readUshort;
			if     (out.ctype==0 || out.ctype==4) out.tabs[type] = [rs(data, offset)];
			else if(out.ctype==2 || out.ctype==6) out.tabs[type] = [rs(data, offset), rs(data, offset+2), rs(data, offset+4)];
			else if(out.ctype==3) out.tabs[type] = data[offset];
		}
		else if(type=="IEND") {
			if(out.compress ==0) dd = UPNG.decode._inflate(dd);
			else console.log("unsupported compression method:", out.interlace);

			if(out.filter!=0) console.log("unsupported filter method:", out.filter);

			if(out.interlace==0) out.data = UPNG.decode._filterZero(dd, out, 0, out.width, out.height);
			else if(out.interlace==1) out.data = UPNG.decode._readInterlace(dd, out);
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

UPNG.decode._inflate = function(data) {  return pako["inflate"](data);  }

UPNG.decode._readInterlace = function(data, out)
{
	var w = out.width, h = out.height;

	var bpp = UPNG.decode._getBPP(out), cbpp = bpp>>3, bpl = Math.ceil(w*bpp/8);
	var img = new Uint8Array( h * bpl );
	var di = 0;

	var starting_row  = [ 0, 0, 4, 0, 2, 0, 1 ];
	var starting_col  = [ 0, 4, 0, 2, 0, 1, 0 ];
	var row_increment = [ 8, 8, 8, 4, 4, 2, 2 ];
	var col_increment = [ 8, 8, 4, 4, 2, 2, 1 ];

	var pass=0;
	while(pass<7)
	{
		var ri = row_increment[pass], ci = col_increment[pass];
		var sw = 0, sh = 0;
		var cr = starting_row[pass];  while(cr<h) {  cr+=ri;  sh++;  }
		var cc = starting_col[pass];  while(cc<w) {  cc+=ci;  sw++;  }
		var bpll = Math.ceil(sw*bpp/8);
		//console.log(di, sw, sh);
		UPNG.decode._filterZero(data, out, di, sw, sh);

		var y=0;
		var row = starting_row[pass];
		while(row<h)
		{
			var col = starting_col[pass];
			var cdi = (di+y*bpll)<<3;

			while(col<w)
			{
				if(bpp==1) {
					var val = data[cdi>>3];  val = (val>>(7-(cdi&7)))&1;
					img[row*bpl + (col>>3)] |= (val << (7-((col&3)<<0)));
				}
				if(bpp==2) {
					var val = data[cdi>>3];  val = (val>>(6-(cdi&7)))&3;
					img[row*bpl + (col>>2)] |= (val << (6-((col&3)<<1)));
				}
				if(bpp==4) {
					var val = data[cdi>>3];  val = (val>>(4-(cdi&7)))&15;
					img[row*bpl + (col>>1)] |= (val << (4-((col&1)<<2)));
				}
				if(bpp>=8) {
					var ii = row*bpl+col*cbpp;
					for(var j=0; j<cbpp; j++) img[ii+j] = data[(cdi>>3)+j];
				}
				cdi+=bpp;
				col+=ci;
			}
			y++;
			row += ri;
		}
		if(sw*sh!=0) di += sh * (1 + bpll);
		pass = pass + 1;
	}
	return img;
}

UPNG.decode._getBPP = function(out)
{
	var noc = 0, ctype = out.ctype;		// number of channels
	if     (ctype==0) noc = 1;
	else if(ctype==2) noc = 3;
	else if(ctype==3) noc = 1;
	else if(ctype==4) noc = 2;
	else if(ctype==6) noc = 4;
	else console.log("unsupported color type", ctype);
	return noc * out.depth;
}

UPNG.decode._filterZero = function(data, out, off, w, h)
{
	var bpp = UPNG.decode._getBPP(out), bpl = Math.ceil(w*bpp/8);;
	bpp = Math.ceil(bpp/8);

	for(var y=0; y<h; y++)
	{
		var i = off+y*bpl, di = i+y+1;
		var type = data[di-1];

		if    (type==0) for(var x=  0; x<bpl; x++) data[i+x] = data[di+x];
		else if(type==1) {
			for(var x=  0; x<bpp; x++) data[i+x] = data[di+x];
			for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpp])&255;
		}
		else if(y==0) {
			for(var x=  0; x<bpp; x++) data[i+x] = data[di+x];

			if(type==2) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x])&255;
			if(type==3) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + (data[i+x-bpp]>>>1) )&255;
			if(type==4) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + UPNG.decode._paeth(data[i+x-bpp], 0, 0) )&255;
		}
		else {
			if(type==2) for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x] + data[i+x-bpl])&255;
			if(type==3) for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x] + (data[i+x-bpl]>>>1))&255;
			if(type==4) for(var x=  0; x<bpp; x++) data[i+x] = (data[di+x] + UPNG.decode._paeth(0, data[i+x-bpl], 0))&255;

			if(type==2) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpl])&255;
			if(type==3) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + ((data[i+x-bpl]+data[i+x-bpp])>>>1) )&255;
			if(type==4) for(var x=bpp; x<bpl; x++) data[i+x] = (data[di+x] + UPNG.decode._paeth(data[i+x-bpp], data[i+x-bpl], data[i+x-bpp-bpl]) )&255;
		}
		if(type>4) console.log("unknown filter type", type, y);
	}
	return data;
}

UPNG.decode._paeth = function(a,b,c)
{
	var p = a+b-c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c), Pr = 0;
	if (pa <= pb && pa <= pc)  Pr = a;
	else if (pb <= pc)  Pr = b;
	else Pr = c;
	return Pr;
}

UPNG.decode._IHDR = function(data, offset, out)
{
	var bin = UPNG._bin;
	out.width  = bin.readUint(data, offset);  offset += 4;
	out.height = bin.readUint(data, offset);  offset += 4;
	out.depth = data[offset];  offset++;
	out.ctype = data[offset];  offset++;
	out.compress  = data[offset];  offset++;
	out.filter    = data[offset];  offset++;
	out.interlace = data[offset];  offset++;
}




UPNG._bin = {
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
		for(var i=0; i<l; i++) s += "%" + UPNG._bin.pad(buff[p+i].toString(16));
		return decodeURIComponent(s);
	},
	readBytes : function(buff, p, l)
	{
		var arr = [];
		for(var i=0; i<l; i++) arr.push(buff[p+i]);
		return arr;
	}
}

export const toRGBA8 = UPNG.toRGBA8;
export const decode = UPNG.decode;
