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

  it('should fail to deploy if there are more shares than payees', async () => {
    const [deployer, account1] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );

    // deploy the payment splitter with 1 user but two items in the shares array
    await expect(
      PaymentSplitterFactory.connect(deployer).deploy(
        [account1.address],
        [1, 2]
      )
    ).to.be.revertedWith('PaymentSplitter: payees and shares length mismatch');
  });

  it('should fail to deploy if the payees array is empty', async () => {
    const [deployer] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );

    // deploy the payment splitter with empty arrays
    await expect(
      PaymentSplitterFactory.connect(deployer).deploy([], [])
    ).to.be.revertedWith('PaymentSplitter: no payees');
  });

  it('should fail to deploy if there are more payees than shares', async () => {
    const [deployer, account1, account2] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );

    // deploy the payment splitter with 1 user but two items in the shares array
    await expect(
      PaymentSplitterFactory.connect(deployer).deploy(
        [account1.address, account2.address],
        [1]
      )
    ).to.be.revertedWith('PaymentSplitter: payees and shares length mismatch');
  });

  it('should fail to deploy if there is a payee with zero address', async () => {
    const [deployer, account1] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );
    // deploy the payment splitter with a zero address payee
    await expect(
      PaymentSplitterFactory.connect(deployer).deploy(
        [account1.address, ethers.constants.AddressZero],
        [1, 2]
      )
    ).to.be.revertedWith('PaymentSplitter: account is the zero address');
  });

  it('should fail to deploy if there is a zero in the shares array', async () => {
    const [deployer, account1, account2] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );
    // deploy the payment splitter with 0 in the shares array
    await expect(
      PaymentSplitterFactory.connect(deployer).deploy(
        [account1.address, account2.address],
        [1, 0]
      )
    ).to.be.revertedWith('PaymentSplitter: shares are 0');
  });

  it('should fail to deploy if there is a repeated payee', async () => {
    const [deployer, account1] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );
    // deploy the payment splitter with two account1
    await expect(
      PaymentSplitterFactory.connect(deployer).deploy(
        [account1.address, account1.address],
        [1, 1]
      )
    ).to.be.revertedWith('PaymentSplitter: account already has shares');
  });
});
