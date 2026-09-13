import * as T from 'three';
/** Decorative architecture stays outside the actual yard boundary (±3.7 m).
 * It creates no physical obstacles and cannot affect a match. */
export function arenaSetting(scene:T.Scene){
  const group=new T.Group();scene.add(group);const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[];
  const mat=(color:string)=>{const m=new T.MeshStandardMaterial({color,roughness:.96});materials.push(m);return m;};
  const stone=mat('#bcb5a6'),dark=mat('#766e5f'),paper=mat('#ddd6c5'),red=mat('#a4473d'),blue=mat('#405e80');
  function box(size:[number,number,number],pos:[number,number,number],m:T.Material){const g=new T.BoxGeometry(...size);geometries.push(g);const mesh=new T.Mesh(g,m);mesh.position.set(...pos);mesh.receiveShadow=true;group.add(mesh);return mesh;}
  for(let i=0;i<3;i++)box([12,.32,.8],[0,.16+i*.32,-4.9-i*.8],i===2?dark:stone);
  box([12,.11,3],[0,-.03,-5.5],paper);
  for(const sign of [-1,1]){
    for(let i=0;i<2;i++)box([.62,.32,9],[sign*(4.9+i*.7),.16+i*.32,-.5],stone);
    const pole=box([.045,3.4,.045],[sign*4.18,1.7,-3.95],dark);pole.castShadow=true;
    const flag=box([.62,1.2,.015],[sign*4.18,2.65,-3.94],sign<0?red:blue);flag.castShadow=true;
    box([.10,.5,.025],[sign*4.18,2.65,-3.92],paper);
    box([.42,.10,.025],[sign*4.18,2.65,-3.91],paper);
    box([.5,.68,.5],[sign*4.15,.34,-3.94],stone);
  }
  // One instanced draw per spectator part, not dozens of animated agents.
  const headGeo=new T.SphereGeometry(.10,8,6),bodyGeo=new T.CylinderGeometry(.06,.1,.34,6);geometries.push(headGeo,bodyGeo);
  const people=mat('#8e887a'),heads=new T.InstancedMesh(headGeo,people,48),bodies=new T.InstancedMesh(bodyGeo,people,48);group.add(heads,bodies);
  const matrix=new T.Matrix4();for(let i=0;i<48;i++){const row=Math.floor(i/16),x=(i%16-7.5)*.68,z=-4.9-row*.8,y=.45+row*.32;
    heads.setMatrixAt(i,matrix.makeTranslation(x,y+.35,z));bodies.setMatrixAt(i,matrix.makeTranslation(x,y+.10,z));}
  heads.instanceMatrix.needsUpdate=bodies.instanceMatrix.needsUpdate=true;
  // Radial paving and the original fight boundary remain readable.
  const lines:number[]=[];for(let x=-3;x<=3;x++){lines.push(x,.007,-3.6,x,.007,-2.8,x,.007,2.8,x,.007,3.6);}
  const geo=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(lines,3));geometries.push(geo);
  const ink=new T.LineBasicMaterial({color:'#b8ae98',transparent:true,opacity:.55});materials.push(ink);group.add(new T.LineSegments(geo,ink));
  return {dispose(){scene.remove(group);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());heads.dispose();bodies.dispose();}};
}
