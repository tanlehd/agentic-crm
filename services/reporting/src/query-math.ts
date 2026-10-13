export interface Rational {n:bigint;d:bigint}
export const rational=(n:bigint,d=1n):Rational=>({n,d});
export function decimal(value:string|number):Rational{
 const s=String(value);if(!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,8})?$/.test(s))throw new Error('INVALID_DECIMAL');
 const [whole,fraction='']=s.split('.');return {n:BigInt(whole!+fraction),d:10n**BigInt(fraction.length)};
}
export const add=(a:Rational,b:Rational):Rational=>({n:a.n*b.d+b.n*a.d,d:a.d*b.d});
function gcd(a:bigint,b:bigint):bigint{a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a||1n;}
export function sum(values:Rational[]):Rational{let n=0n,d=1n;for(const v of values){n=n*v.d+v.n*d;d*=v.d;const g=gcd(n,d);n/=g;d/=g;}return {n,d};}
export const divide=(a:Rational,b:Rational,multiplier=1n):Rational|null=>b.n===0n?null:{n:a.n*b.d*multiplier*(b.n<0n?-1n:1n),d:a.d*(b.n<0n?-b.n:b.n)};
export function format(value:Rational|null,places=6):string|null{
 if(value===null)return null;const scale=10n**BigInt(places),abs=value.n<0n?-value.n:value.n;const q=(abs*scale*2n+value.d)/(2n*value.d);const digits=q.toString().padStart(places+1,'0'),sign=value.n<0n&&q!==0n?'-':'';
 return sign+(places?digits.slice(0,-places)+'.'+digits.slice(-places):digits);
}
