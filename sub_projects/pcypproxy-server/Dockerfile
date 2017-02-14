FROM node:6-alpine

ADD lib /work/lib
ADD node_modules /work/node_modules
ADD package.json /work/

WORKDIR /work

EXPOSE 8080
CMD ["npm", "start"]
