import re
BIN="/home/whs/.local/share/claude/versions/2.1.169"
data=open(BIN,'rb').read()
size=len(data)
anchor=232021309
# printable test: allow tab/newline + 0x20-0x7e
def printable(b): return b==9 or b==10 or b==13 or (32<=b<=126)
# scan back to start of run
s=anchor
while s>0 and printable(data[s-1]): s-=1
e=anchor
while e<size and printable(data[e]): e+=1
print("contiguous printable run:",s,"->",e,"len",e-s)
# That run might be one giant line. The whole source is likely many runs separated by other data.
# Find ALL large printable runs (>50KB) in tail half of file (>200MB)
runs=[]
i=200_000_000
start=None
while i<size:
    if printable(data[i]):
        if start is None: start=i
    else:
        if start is not None and i-start>50_000:
            runs.append((start,i,i-start))
        start=None
    i+=1
if start is not None and size-start>50_000: runs.append((start,size,size-start))
print("large (>50KB) printable runs in tail:",len(runs))
for r in runs[:30]: print(f"  {r[0]:>12} -> {r[1]:>12}  {r[2]:>12} bytes")
tot=sum(r[2] for r in runs)
print("total tail JS bytes:",tot)
