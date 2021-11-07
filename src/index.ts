import crypto from 'crypto';

import express, {Request, Response, NextFunction} from 'express';
import cors from 'cors';

import {ip, DataIP} from './middleware.ip';

const app = express();
const port = process.env.PORT || 3007;

app.use(express.json());

app.use(cors({
	origin: '*'
}));

// add ip middleware
app.use(ip);

app.get('/', (req, res) => {
	res.status(200).json(req.dataIP);
});

app.use((err:Error, req:Request, res:Response, next:NextFunction) => {
	console.error(err.stack);
	res.status(500).send(err.toString());
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
});
