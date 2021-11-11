echo "Inside cluster setup"
ls -l
#Create cluster if don't exist
eksctl delete cluster --name=preview-server  --wait
aws eks --region $AWS_DEFAULT_REGION update-kubeconfig --name preview-server || eksctl create cluster -f ./eks/cluster.yaml