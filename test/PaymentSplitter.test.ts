import {expect} from './chai-setup';
import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {PaymentSplitter__factory} from '../typechain';
import {setupUser, setupUsers} from './utils';

describe('PaymentSplitter', () => {
  it('should deploy the smart contract', async () => {
    // retrieve some accounts that can be used for testing
    const [deployer, account1] = await ethers.getSigners();

    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );

    // deploy the payment splitter with only 1 user with 1 share
    const paymentSplitterInstance = await PaymentSplitterFactory.connect(
      deployer
    ).deploy([account1.address], [1]);

    // wait for deployment to complete
    await paymentSplitterInstance.deployed();

    // just check that it has an address
    expect(paymentSplitterInstance.address).to.not.be.null;
  });
});
