import { describe, expect, it } from 'vitest';
import { parseAssociations, requireAIResponse } from './association-client';
const suggestions = ['Bracelet','Medal','Treasure'].map((title,index)=>({id:String(index),title,explanation:'A visual cue',prompt:'An isolated '+title}));
describe('authoring client provider boundary',()=>{
  it('accepts exactly three complete suggestions',()=>expect(parseAssociations({suggestions})).toEqual(suggestions));
  it.each([null,{}, {suggestions:suggestions.slice(0,2)},{suggestions:[{},...suggestions.slice(1)]},{suggestions:[suggestions[0],suggestions[0],suggestions[2]]}])('rejects incomplete or duplicate suggestions before selection',value=>expect(()=>parseAssociations(value)).toThrow());
  it('preserves successful binary response for image import',async()=>{const response=new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}});expect(await requireAIResponse(response)).toBe(response);});
  it('shows useful server errors',async()=>{await expect(requireAIResponse(Response.json({error:'Enter the correct demo access code.'},{status:401}))).rejects.toThrow('correct demo access code');});
  it('handles HTML proxy failures with a useful generic error',async()=>{await expect(requireAIResponse(new Response('<html>bad gateway</html>',{status:502}))).rejects.toThrow('Retry manually');});
});
