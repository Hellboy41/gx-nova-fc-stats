import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
const KEY_NAME="ATYOM_DISCORD_WEBHOOK_KEY";
function key(){
 const value=process.env[KEY_NAME];
 if(!value||!/^([a-f\d]{64})$/i.test(value))throw new Error("La clé de chiffrement Discord côté serveur est absente.");
 return Buffer.from(value,"hex");
}
export function encryptWebhook(url:string){
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);
 const payload=Buffer.concat([cipher.update(url,"utf8"),cipher.final()]);
 return [iv.toString("hex"),cipher.getAuthTag().toString("hex"),payload.toString("hex")].join(".");
}
export function decryptWebhook(value:string){
 const [iv,tag,body]=value.split(".");
 if(!iv||!tag||!body)throw new Error("Configuration de canal Discord invalide.");
 const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"hex"));
 decipher.setAuthTag(Buffer.from(tag,"hex"));
 return Buffer.concat([decipher.update(Buffer.from(body,"hex")),decipher.final()]).toString("utf8");
}
export function parseWebhook(input:string):{id:string;apiUrl:string}{
 let url:URL;try{url=new URL(input.trim());}catch{throw new Error("Colle une URL de webhook Discord valide.");}
 if(url.protocol!=="https:"||url.hostname!=="discord.com"||url.port||url.search||url.hash)
  throw new Error("Le webhook doit provenir exclusivement de discord.com.");
 const match=url.pathname.match(/^\/api(?:\/v10)?\/webhooks\/([0-9]{15,24})\/([a-zA-Z0-9_.-]{30,})\/?$/);
 if(!match)throw new Error("L'adresse doit être celle d'un webhook Discord complet.");
 return {id:match[1],apiUrl:`https://discord.com/api/v10/webhooks/${match[1]}/${match[2]}`};
}
