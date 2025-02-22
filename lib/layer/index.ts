import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';

interface LayerProps {
  runtime: lambda.Runtime;
  architecture: lambda.Architecture;
  path: string;
  autoUpgrade?: boolean;
}

export class Layer extends Construct {
  public layer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: LayerProps) {
    super(scope, id);

    const { runtime, architecture, path, autoUpgrade } = props;

    const args = ['-t /asset-output/python'];
    if (autoUpgrade) {
      args.push('--upgrade');
    }
    console.log(`Bundling ${runtime.name} ${architecture.name} layer with ${args.join(' ')}`);
    console.log(`DOCKER_DEFAULT_PLATFORM=${process.env.DOCKER_DEFAULT_PLATFORM}`)

    const layerAsset = new s3assets.Asset(this, 'LayerAsset', {
      path,
      bundling: {
        image: runtime.bundlingImage,
        platform: architecture.dockerPlatform,
        command: ['bash', '-c', `pip install -r requirements.txt ${args.join(' ')}`],
        outputType: cdk.BundlingOutput.AUTO_DISCOVER,
        securityOpt: 'no-new-privileges:true',
        network: 'host',
      },
    });

    const layer = new lambda.LayerVersion(this, `Layer`, {
      code: lambda.Code.fromBucket(layerAsset.bucket, layerAsset.s3ObjectKey),
      compatibleRuntimes: [runtime],
      compatibleArchitectures: [architecture],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.layer = layer;
  }
}
