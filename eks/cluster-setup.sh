echo "Inside cluster setup"
echo $AWS_DEFAULT_REGION
#Create cluster if don't exist
#aws ec2 describe-instance-type-offerings --location-type availability-zone  --filters Name=instance-type,Values=p2.xlarge --region us-west-1 --output table
eksctl delete cluster --name=preview-server  --wait || echo "No Cluster named Preview Server"
aws eks --region $AWS_DEFAULT_REGION update-kubeconfig --name preview-server || eksctl create cluster -f ./eks/cluster.yaml
