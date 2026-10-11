import type { Palace } from './model';

/** Resolve against the visible room, never against every hotspot in the tour. */
export function roomSelection(palace:Palace,roomId:string,markerId:string) {
  const link=palace.links.find(item=>item.id===markerId&&item.roomId===roomId);
  if(link&&palace.rooms.some(room=>room.id===link.targetRoomId))return {kind:'link' as const,item:link};
  const memory=palace.memories.find(item=>item.id===markerId&&item.roomId===roomId);
  return memory?{kind:'memory' as const,item:memory}:null;
}
