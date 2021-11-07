import {DataIP} from "../../middleware.ip";

declare global{
	namespace Express {
		interface Request {
			dataIP: DataIP
		}
	}
}
