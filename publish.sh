#!/bin/bash

rm -rf lib &&
  yarn build &&
  cp package.json lib &&
  cd lib &&
  npm publish --access public &&
  cd - &&
  exit
