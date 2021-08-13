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

  it('should receive payment correctly', async () => {
    const [deployer, account1] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );
    const paymentSplitterInstance = await PaymentSplitterFactory.connect(
      deployer
    ).deploy([account1.address], [1]);

    await paymentSplitterInstance.deployed();

    expect(paymentSplitterInstance.address).to.not.be.null;

    await deployer.sendTransaction({
      to: paymentSplitterInstance.address,
      value: ethers.utils.parseEther('1'),
    });
    const balance = await ethers.provider.getBalance(
      paymentSplitterInstance.address
    );
    expect(ethers.utils.formatEther(balance.toString())).to.equal('1.0');
  });

  it('should reject a request to release funds to address without shares', async () => {
    const [deployer, account1, account2] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );
    const paymentSplitterInstance = await PaymentSplitterFactory.connect(
      deployer
    ).deploy([account1.address], [1]);

    await paymentSplitterInstance.deployed();

    await expect(
      paymentSplitterInstance.release(account2.address)
    ).to.be.revertedWith('PaymentSplitter: account has no shares');
  });

  it('should reject a request to release funds to address not owed payment', async () => {
    const [deployer, account1] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );
    const paymentSplitterInstance = await PaymentSplitterFactory.connect(
      deployer
    ).deploy([account1.address], [1]);

    await paymentSplitterInstance.deployed();

    await expect(
      paymentSplitterInstance.release(account1.address)
    ).to.be.revertedWith('PaymentSplitter: account is not due payment');
  });

  it('should distribute funds correctly to equal share holders', async () => {
    const [deployer, account1, account2] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );
    // deploy the payment splitter with 10 shares total, 5 to each user
    const paymentSplitterInstance = await PaymentSplitterFactory.connect(
      deployer
    ).deploy([account1.address, account2.address], [5, 5]);

    await paymentSplitterInstance.deployed();

    expect(paymentSplitterInstance.address).to.not.be.null;

    // send 1 eth to the splitter
    await deployer.sendTransaction({
      to: paymentSplitterInstance.address,
      value: ethers.utils.parseEther('1'),
    });

    // check initial balance so that we can calculate the transferred amount
    const account1InitialBalance = await ethers.provider.getBalance(
      account1.address
    );

    // release funds for account1
    const account1Release = await paymentSplitterInstance.release(
      account1.address
    );

    const account1NewBalance = await ethers.provider.getBalance(
      account1.address
    );
    const account1Profit = account1NewBalance.sub(account1InitialBalance);
    expect(ethers.utils.formatEther(account1Profit.toString())).to.equal('0.5');

    // do the same for account 2
    const account2InitialBalance = await ethers.provider.getBalance(
      account2.address
    );

    // release funds for account1
    const account2Release = await paymentSplitterInstance.release(
      account2.address
    );

    const account2NewBalance = await ethers.provider.getBalance(
      account2.address
    );
    const account2Profit = account2NewBalance.sub(account2InitialBalance);
    expect(ethers.utils.formatEther(account2Profit.toString())).to.equal('0.5');
  });

  it('should distribute funds correctly to unequal share holders', async () => {
    const [deployer, account1, account2] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );
    // deploy the payment splitter with 10 shares total, 5 to each user
    const paymentSplitterInstance = await PaymentSplitterFactory.connect(
      deployer
    ).deploy([account1.address, account2.address], [1, 4]);

    await paymentSplitterInstance.deployed();

    expect(paymentSplitterInstance.address).to.not.be.null;

    // send 1 eth to the splitter
    await deployer.sendTransaction({
      to: paymentSplitterInstance.address,
      value: ethers.utils.parseEther('1'),
    });

    // check initial balance so that we can calculate the transferred amount
    const account1InitialBalance = await ethers.provider.getBalance(
      account1.address
    );

    // release funds for account1
    const account1Release = await paymentSplitterInstance.release(
      account1.address
    );

    const account1NewBalance = await ethers.provider.getBalance(
      account1.address
    );
    const account1Profit = account1NewBalance.sub(account1InitialBalance);
    expect(ethers.utils.formatEther(account1Profit.toString())).to.equal('0.2');

    // do the same for account 2
    const account2InitialBalance = await ethers.provider.getBalance(
      account2.address
    );

    // release funds for account2
    const account2Release = await paymentSplitterInstance.release(
      account2.address
    );

    const account2NewBalance = await ethers.provider.getBalance(
      account2.address
    );
    const account2Profit = account2NewBalance.sub(account2InitialBalance);
    expect(ethers.utils.formatEther(account2Profit.toString())).to.equal('0.8');
  });

  it('should distribute funds correctly to equal share holders', async () => {
    const [deployer, account1, account2] = await ethers.getSigners();
    const PaymentSplitterFactory = await ethers.getContractFactory(
      'PaymentSplitter'
    );
    // deploy the payment splitter with 10 shares total, 5 to each user
    const paymentSplitterInstance = await PaymentSplitterFactory.connect(
      deployer
    ).deploy([account1.address, account2.address], [5, 5]);

    await paymentSplitterInstance.deployed();

    expect(paymentSplitterInstance.address).to.not.be.null;

    // send 1 eth to the splitter
    await deployer.sendTransaction({
      to: paymentSplitterInstance.address,
      value: ethers.utils.parseEther('1'),
    });

    // check initial balance so that we can calculate the transferred amount
    const account1InitialBalance = await ethers.provider.getBalance(
      account1.address
    );

    // release funds for account1
    const account1Release = await paymentSplitterInstance.release(
      account1.address
    );

    const account1NewBalance = await ethers.provider.getBalance(
      account1.address
    );
    const account1Profit = account1NewBalance.sub(account1InitialBalance);
    expect(ethers.utils.formatEther(account1Profit.toString())).to.equal('0.5');

    // send another 1 eth to the splitter
    await deployer.sendTransaction({
      to: paymentSplitterInstance.address,
      value: ethers.utils.parseEther('1'),
    });

    // at this point the total received by the splitter should be 2 eth
    // therefore we should expect the account2 profit to be 1 eth
    // and we should be able to withdraw another 0.5 eth for account1

    const account2InitialBalance = await ethers.provider.getBalance(
      account2.address
    );

    // release funds for account2
    const account2Release = await paymentSplitterInstance.release(
      account2.address
    );

    const account2NewBalance = await ethers.provider.getBalance(
      account2.address
    );
    const account2Profit = account2NewBalance.sub(account2InitialBalance);
    expect(ethers.utils.formatEther(account2Profit.toString())).to.equal('1.0');

    // attempt second release for account1
    const account1Release2 = await paymentSplitterInstance.release(
      account1.address
    );

    const account1NewBalance2 = await ethers.provider.getBalance(
      account1.address
    );
    const account1Profit2 = account1NewBalance2.sub(account1NewBalance);
    expect(ethers.utils.formatEther(account1Profit2.toString())).to.equal(
      '0.2'
    );
  });
});
