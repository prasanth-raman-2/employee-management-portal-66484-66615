#!/bin/bash
cd /home/kavia/workspace/code-generation/employee-management-portal-66484-66615/FrontendApplication
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

