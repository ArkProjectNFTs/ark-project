#!/bin/bash

# Function to display usage
display_usage() {
    echo "Usage: $0 [--tasks <TASKS>] --from <FROM> --to <TO>"
    echo "<FROM> and <TO> must be numbers."
}

# Function to launch an ECS task
launch_ecs_task() {
    local SUB_FROM=$1
    local SUB_TO=$2

    local ENV_VAR_NAME1="START_BLOCK"
    local ENV_VAR_NAME2="END_BLOCK"

    local OVERRIDES="{\"containerOverrides\":[{\"name\":\"ark_indexer\",\"environment\":[{\"name\":\"$ENV_VAR_NAME1\",\"value\":\"$SUB_FROM\"},{\"name\":\"$ENV_VAR_NAME2\",\"value\":\"$SUB_TO\"}]}]}"

    aws ecs run-task \
      --cluster "$CLUSTER_NAME" \
      --task-definition "$TASK_DEFINITION" \
      --launch-type "FARGATE" \
      --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
      --overrides "$OVERRIDES" &
}

# Initialization of variables
TASKS=1  # Default value
FROM=""
TO=""
NETWORK=""

# Parsing the options
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -t|--tasks) TASKS="$2"; shift ;;
        --from) FROM="$2"; shift ;;
        --to) TO="$2"; shift ;;
        --network) NETWORK="$2"; shift ;;
        *) 
            echo "Unknown parameter passed: $1"
            display_usage
            exit 1 ;;
    esac
    shift
done

# Set environment variables based on the network value
case $NETWORK in
    testnet)
        TASK_DEFINITION="ark-indexer-testnet"
        SUBNET_ID="subnet-04e9a5e885cd717cd"
        ;;
    mainnet)
        TASK_DEFINITION="ark-indexer"
        SUBNET_ID="subnet-0c28889f016ad63f5"
        ;;
    *)
        echo "Invalid or missing network value. Please use --network with either 'testnet' or 'mainnet'."
        exit 1
        ;;
esac

# Validation of options
if [[ -z "$FROM" || ! "$FROM" =~ ^[0-9]+$ || -z "$TO" || ! "$TO" =~ ^[0-9]+$ || -z "$NETWORK" ]]; then
    display_usage
    exit 1
fi

# Calculate the size of each subrange
RANGE_SIZE=$(( ($TO - $FROM + 1) / $TASKS ))
CLUSTER_NAME="arn:aws:ecs:us-east-1:223605539824:cluster/ark-indexers"
SECURITY_GROUP_ID="sg-0c1b5d08ea088eb53"

# Using the TASKS variable to launch multiple tasks
for ((i=0; i<$TASKS; i++)); do
    SUB_FROM=$(( $FROM + $RANGE_SIZE * $i ))
    SUB_TO=$(( $SUB_FROM + $RANGE_SIZE - 1 ))
    
    if (( $SUB_TO > $TO || i == $TASKS - 1 )); then
        SUB_TO=$TO
    fi

    # Displaying the task range being launched
    echo "Launching task with range: from=$SUB_FROM to=$SUB_TO"

    launch_ecs_task $SUB_FROM $SUB_TO
done
