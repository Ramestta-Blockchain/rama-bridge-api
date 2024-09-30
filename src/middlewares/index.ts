import type { Request, Response, NextFunction } from 'express'

export const asyncMiddleware = (theFunc: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(theFunc(req, res, next)).catch(next)
}