import os, json, math, subprocess, wave
from PIL import Image, ImageDraw, ImageChops, ImageFont, ImageOps, ImageEnhance, ImageFilter

W,H,FPS=1280,720,30
AUDIO='/tmp/luna/mix_raw.wav'
OUT='/mnt/documents/alunizaje_animacion_luna_youtube_v3.mp4'
MARKS=json.load(open('/tmp/luna/marks.json'))
with wave.open(AUDIO) as w: DUR=w.getnframes()/w.getframerate()
N=math.ceil(FPS*DUR)

def font(sz,cond=True):
    family='DejaVu Sans Condensed:bold' if cond else 'DejaVu Sans:bold'
    p=subprocess.run(['fc-match','-f','%{file}',family],capture_output=True,text=True,check=True).stdout
    return ImageFont.truetype(p,sz)
F_TITLE=font(72); F_BIG=font(58); F_MED=font(40); F_QUOTE=font(44); F_SMALL=font(28)
RED=(205,45,50,255); BLUE=(24,93,154,255); GOLD=(226,158,42,255); INK=(28,32,36,255); MUTED=(86,92,98,255)
hand=Image.open('/dev-server/public/demo/mano-lapiz.png').convert('RGBA').resize((280,280),Image.Resampling.LANCZOS)
TIPX,TIPY=int(.205*280),int(.664*280)

def load(path,w):
    im=Image.open(path).convert('RGBA')
    bb=im.getbbox()
    if bb: im=im.crop(bb)
    im.thumbnail((w,590),Image.Resampling.LANCZOS)
    return im
ref='/mnt/documents/ref/'
IMG={
 'moon':load(ref+'luna.png',360),
 'saturn':load(ref+'luna2-saturn-moon.png',790),
 'kennedy_intro':load(ref+'luna2-kennedy.png',470),
 'kennedy_speech':load(ref+'luna3-kennedy-discurso.png',700),
 'gagarin':load(ref+'luna2-gagarin.png',430),
 'patio_night':load(ref+'luna3-patio-luna.png',730),
 'engineers':load(ref+'luna3-ingenieros.png',720),
 'mercury':load(ref+'luna3-mercury-15.png',720),
 'space_race':load(ref+'luna3-carrera-espacial.png',760),
 'crew':load(ref+'luna3-apollo1-tripulacion.png',690),
 'ground_test':load(ref+'luna3-apollo1-prueba.png',720),
 'spark':load(ref+'luna3-chispa.png',720),
 'grissom':load(ref+'luna3-grissom-cita.png',700),
}

def ink_version(im):
    # Preserve the recognisable ink contours, while washing fills out until the color pass.
    rgb=Image.new('RGB',im.size,'white'); rgb.paste(im,mask=im.getchannel('A'))
    gray=ImageOps.grayscale(rgb)
    gray=ImageOps.autocontrast(gray,cutoff=1)
    gray=ImageEnhance.Contrast(gray).enhance(1.45)
    pale=Image.blend(Image.new('L',im.size,255),gray,0.78)
    out=Image.merge('RGBA',(pale,pale,pale,im.getchannel('A')))
    return out
INK_IMG={k:ink_version(v) for k,v in IMG.items()}

def text_layer(lines, colors, f, align='center', spacing=4):
    tmp=Image.new('RGBA',(10,10)); d=ImageDraw.Draw(tmp)
    if not isinstance(colors,list): colors=[colors]*len(lines)
    boxes=[d.textbbox((0,0),x,font=f) for x in lines]
    widths=[b[2]-b[0] for b in boxes]; heights=[b[3]-b[1]+spacing for b in boxes]
    ww=max(widths)+24; hh=sum(heights)+20
    lay=Image.new('RGBA',(ww,hh),(0,0,0,0)); dd=ImageDraw.Draw(lay); y=4
    for line,c,tw,th in zip(lines,colors,widths,heights):
        x=12 if align=='left' else (ww-tw)//2
        # soft offset gives titles a crafted printed finish without losing whiteboard clarity
        dd.text((x+2,y+2),line,font=f,fill=(20,20,20,40))
        dd.text((x,y),line,font=f,fill=c)
        y+=th
    return lay

# Screen entries: first narration segment, elements. i=(asset,x,y,width implicit); t=(lines,colors,font,x,y)
SCREENS=[
 (0,[('t',['EL ALUNIZAJE'],[RED],F_TITLE,74,50),('t',['LA HISTORIA QUE', 'PARECÍA IMPOSIBLE'],[BLUE,GOLD],F_MED,76,135),('i','moon',825,205)]),
 (1,[('i','patio_night',34,82),('t',['LA MISMA LUNA'],[BLUE],F_MED,760,110),('t',['QUE MIRÓ', 'TODA LA', 'HUMANIDAD'],[INK,GOLD,RED],F_BIG,805,190)]),
 (2,[('t',['OCHO AÑOS'],[RED],F_TITLE,64,65),('t',['DE LA TIERRA', 'A LA LUNA'],[INK,BLUE],F_BIG,70,170),('i','saturn',475,105)]),
 (3,[('t',['25 MAY 1961'],[GOLD],F_MED,64,50),('i','kennedy_intro',90,135),('t',['KENNEDY', 'ANTE EL', 'CONGRESO'],[BLUE,INK,RED],F_BIG,650,185)]),
 (4,[('i','kennedy_speech',28,82),('t',['«UN HOMBRE', 'EN LA LUNA'],[INK,RED],F_QUOTE,735,122),('t',['Y DE VUELTA', 'SANO Y SALVO»'],[BLUE,GOLD],F_QUOTE,760,240)]),
 (5,[('i','engineers',35,80),('t',['EL DESAFÍO'],[RED],F_BIG,760,105),('t',['REGLAS DE CÁLCULO', 'CAFÉ FRÍO', 'Y MUCHA PRESIÓN'],[BLUE,GOLD,INK],F_MED,730,205)]),
 (6,[('i','mercury',32,82),('t',['SOLO'],[INK],F_BIG,790,102),('t',['15 MINUTOS'],[RED],F_TITLE,730,165),('t',['DE EXPERIENCIA'],[BLUE],F_MED,790,258)]),
 (7,[('i','gagarin',75,75),('t',['YURI GAGARIN'],[RED],F_BIG,610,102),('t',['UNA VUELTA', 'COMPLETA A', 'LA TIERRA'],[BLUE,INK,GOLD],F_BIG,665,195)]),
 (8,[('i','space_race',35,82),('t',['LA CARRERA', 'ESPACIAL'],[BLUE,RED],F_BIG,795,105),('t',['EL MOTOR REAL:', 'EL MIEDO'],[INK,GOLD],F_MED,795,255)]),
 (9,[('i','crew',35,105),('t',['APOLO 1'],[RED],F_TITLE,805,72),('t',['GRISSOM', 'WHITE', 'CHAFFEE'],[BLUE,INK,GOLD],F_MED,855,185)]),
 (10,[('i','ground_test',30,82),('t',['27 ENE 1967'],[GOLD],F_MED,795,82),('t',['UNA PRUEBA', 'EN TIERRA'],[BLUE,INK],F_BIG,780,180)]),
 (11,[('i','spark',34,82),('t',['OXÍGENO PURO'],[BLUE],F_MED,785,90),('t',['UNA CHISPA'],[GOLD],F_BIG,780,160),('t',['SEGUNDOS', 'FATALES'],[INK,RED],F_BIG,820,245)]),
 (12,[('i','grissom',35,82),('t',['GUS GRISSOM'],[BLUE],F_MED,790,88),('t',['«ESTE ES UN', 'NEGOCIO', 'RIESGOSO»'],[INK,RED,GOLD],F_QUOTE,790,170)]),
]

def scale_asset(key): return IMG[key],INK_IMG[key]

def elementize():
    screens=[]
    for si,(mi,specs) in enumerate(SCREENS):
        t0=max(0,MARKS[mi]['t0']-.2)
        end=(MARKS[SCREENS[si+1][0]]['t0']-.2) if si+1<len(SCREENS) else DUR
        available=max(.8,end-t0)
        draw_total=min(available*.55,2.6)
        per=max(.45,draw_total/len(specs)); cur=t0
        els=[]
        for spec in specs:
            if spec[0]=='i':
                _,key,x,y=spec; color,ink=scale_asset(key); rows=max(4,min(9,color.height//65)); lay=color; ink_lay=ink
            else:
                _,lines,colors,ff,x,y=spec; lay=text_layer(lines,colors,ff); ink_lay=text_layer(lines,INK,ff); rows=len(lines)
            els.append(dict(color=lay,ink=ink_lay,x=x,y=y,t0=cur,t1=cur+per,rows=rows,color_t=cur+per))
            cur+=per*.88
        screens.append(dict(t0=t0,t1=end,els=els))
    return screens
SC=elementize()

def mask_reveal(im,rows,p):
    p=max(0,min(1,p)); m=Image.new('L',im.size,0); d=ImageDraw.Draw(m); rh=im.height/rows
    pos=p*rows; row=int(pos); frac=pos-row
    for r in range(min(row,rows)): d.rectangle((0,int(r*rh)-2,im.width,int((r+1)*rh)+2),fill=255)
    tx,ty=im.width,im.height
    if row<rows:
        ww=int(im.width*frac); d.rectangle((0,int(row*rh)-2,ww,int((row+1)*rh)+2),fill=255); tx,ty=ww,row*rh+rh*.55
    out=im.copy(); out.putalpha(ImageChops.multiply(im.getchannel('A'),m)); return out,tx,ty

def paste_fade(canvas,im,xy,alpha):
    if alpha>=.999: canvas.paste(im,xy,im); return
    x=im.copy(); x.putalpha(x.getchannel('A').point(lambda a:int(a*alpha))); canvas.paste(x,xy,x)

def ease(x): x=max(0,min(1,x)); return x*x*(3-2*x)

cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',AUDIO,'-filter_complex',
 '[0:v]scale=1920:1080:flags=lanczos,format=yuv420p[v];[1:a]highpass=f=70,lowpass=f=15000,equalizer=f=3200:t=q:w=1:g=1.5,acompressor=threshold=-18dB:ratio=2.5:attack=15:release=180,loudnorm=I=-16:TP=-1.5:LRA=11[a]',
 '-map','[v]','-map','[a]','-c:v','libx264','-preset','medium','-crf','19','-profile:v','high','-level','4.1','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',OUT]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
assert proc.stdin is not None
for frame in range(N):
    t=frame/FPS
    idx=max(i for i,s in enumerate(SC) if t>=s['t0']) if t>=SC[0]['t0'] else 0
    s=SC[idx]
    # warm white paper with subtle fibers
    canvas=Image.new('RGB',(W,H),(250,249,245)); d=ImageDraw.Draw(canvas)
    for yy in range(18,H,34): d.line((0,yy,W,yy),fill=(247,246,241),width=1)
    tip=None
    for el in s['els']:
        if t<el['t0']: continue
        p=(t-el['t0'])/max(.05,el['t1']-el['t0'])
        if p<1:
            ink,tx,ty=mask_reveal(el['ink'],el['rows'],ease(p)); canvas.paste(ink,(el['x'],el['y']),ink); tip=(el['x']+tx,el['y']+ty)
        else:
            canvas.paste(el['ink'],(el['x'],el['y']),el['ink'])
            cp=ease((t-el['color_t'])/.5)
            if cp>0: paste_fade(canvas,el['color'],(el['x'],el['y']),cp)
    # Animated editorial accents make each title card feel active without obscuring drawings.
    age=max(0.0,t-s['t0']); accent=ease(min(1.0,age/.65))
    if accent>0:
        aw=int(155*accent)
        d.line((72,638,72+aw,638),fill=RED,width=6)
        d.line((82,648,82+int(95*accent),648),fill=BLUE,width=4)
    if tip:
        hx=int(max(-180,min(W-40,tip[0]-TIPX))); hy=int(max(-180,min(H-45,tip[1]-TIPY)))
        canvas.paste(hand,(hx,hy),hand)
    # understated running label anchors the long-form composition
    d=ImageDraw.Draw(canvas); d.line((70,675,1210,675),fill=(214,211,203),width=2)
    d.text((70,683),'ANIMACIÓN LUNA  •  EL ALUNIZAJE',font=font(16),fill=(93,96,99))
    proc.stdin.write(canvas.tobytes())
proc.stdin.close(); code=proc.wait()
if code: raise SystemExit(code)
print(OUT,DUR)
