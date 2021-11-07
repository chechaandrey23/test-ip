import {Router, Request, Response, NextFunction} from 'express';
import forwarded from 'forwarded';
import ipaddr from 'ipaddr.js';
import parse from 'csv-parse';

import {Buffer} from 'buffer';
import path from 'path';
import {readFile} from 'fs/promises';

class MiddlewareIPError extends Error {}

export interface DataIP {
	readonly userIP: string;
	readonly range: Array<string>;
	readonly locale: string;
	readonly location: string;
}

const routers: Router = Router();

function IPv4toUInt32(oIP: Array<number>): number {
	return Buffer.from(oIP).readUInt32BE(0);
}

function UInt32toIPv4(numIP: number):  Array<number> {
	let buff:Buffer = Buffer.allocUnsafe(4);
	buff.writeUInt32BE(numIP, 0);
	return [...buff.values()];
}

const aParse = (input:string, opts?:object) => {
	return new Promise((res, rej): void => {
		parse(input, opts, function(err, output){
			if(err) {
				rej(err);
			} else {
				res(output);
			}
		})
	});
}

let CSVIPDB:Array<Array<any>>;

(async () => {
	CSVIPDB = await aParse(await readFile(path.resolve() + '/content/IP2LOCATION-LITE-DB1.CSV', {encoding: 'utf8'}), {}) as Array<Array<any>>;
})();

function getLocaion(numIP:number): Array<any> {
	let result:Array<any>|undefined = CSVIPDB.find((value: Array<any>, index: number): boolean => {
		return numIP >= value[0] && numIP <= value[1];
	}) as Array<any>|undefined;
	
	if(result === undefined) {
		throw new MiddlewareIPError(`ip address "${UInt32toIPv4(numIP).join('.')} -> (${numIP})" was not found in the database`);
	}
	
	return result;
}

routers.use((req:Request, res:Response, next:NextFunction):void => {
	const rawIPs:string[] = forwarded(req);
	
	const rawIP:string = rawIPs[rawIPs.length-1];
	
	if(!ipaddr.isValid(rawIP)) {
		next(new MiddlewareIPError('An invalid ip address was received which could not be processed'));
	}
	
	const oIP:any = ipaddr.parse(rawIP);
	
	if(oIP.kind() !== 'ipv4') {
		next(new MiddlewareIPError('Work with other formats of ip-addresses is not supported'));
	}
	
	// convert ipv4 to uint32
	let numIP:number = IPv4toUInt32(oIP.octets);
	
	try {
		let data:Array<any> = getLocaion(numIP);
		// patch req:Request
		req.dataIP = {
			userIP: rawIP,
			range: [UInt32toIPv4(data[0]).join('.'), UInt32toIPv4(data[1]).join('.')],
			locale: data[2],
			location: data[3]
		};
	} catch(e) {
		if(e instanceof MiddlewareIPError) {
			next(e);
		} else {
			throw e;
		}
	}
	
	next();
});

export {routers as ip};
