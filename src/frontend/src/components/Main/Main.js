import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import Header from '../Header/Header';
import Food from '../Food/Food';
import Footer from '../Footer/Footer';
import Userpage from '../User/Userpage';
import OrderConfirmation from '../OrderConfirmation/OrderConfirmation';
import UserOrderHistory from '../User/UserOrderHistory';

class MainPage extends Component {
  // Receiving items added to cart, calculating total,
  // and sending total & cart to header for modal use.
  state = {
    userInfo: {},
    isLoggedIn: false,
    total: 0.0,
    cart: [],
    address: '',
    totalToPersist: {
      // sending to firestore after an order is completed
      // this can be refactored later to replace total (same thing can also be done in OrderConfirmation)
      subtotal: 0.0,
      HST: 0.0,
      serviceFee: 0.0,
      deliveryFee: 0.0,
      grandTotal: 0.0,
    },
    deliveryToPersist: {
      driveTime: 0,
      KM: 0,
      destinationAddress: '',
      deliveryAddress: '',
    },
  };

  componentDidMount = async () => {
    await this.fetchUser();
  };

  fetchUser = async () => {
    const response = await fetch('auth/current_user');
    const userInfo = await response.json();
    if (response.status === 200) {
      this.setState({ userInfo: userInfo, isLoggedIn: true });
    } else {
      // TODO: Figure this out.
    }
  };

  receiveOCTotal = (ocTotal) => {
    this.setState({
      totalToPersist: ocTotal,
    });
  };

  receiveCart = (cart) => {
    this.setState({ cart: cart });

    let priceToAdd = this.state.total;

    // Calculating the total of all the items within the cart.
    this.state.cart.map((item) => {
      priceToAdd = this.state.total + item.price;
      return (priceToAdd = Number(priceToAdd.toFixed(2))); // Rounding the total to nearest cent
    });

    this.setState({ total: priceToAdd });
  };

  // This method receives the updated total and cart from Header.js and then sets the state for Main.js
  receiveCartFromModal = async (updatedCart, updatedTotal) => {
    await this.setState({ cart: updatedCart, total: updatedTotal });
  };

  // This method receives the updated cart and total from OrderConfirmation.js and then sets the state for Main.js
  updateCartQuantities = async (updatedCart) => {
    this.setState({ cart: updatedCart });
    // Calculating the total of all the items within the updated cart.
    let newTotal = 0;
    this.state.cart.forEach((item) => {
      newTotal += item.price * item.quantity;
      return (newTotal = Number(newTotal.toFixed(2))); // Rounding the total to nearest cent
    });

    await this.setState({ total: newTotal });
  };

  receiveUserInfoFromUserPage = async (updatedUserInfo) => {
    await this.setState({ userInfo: updatedUserInfo });
  };

  receiveTokenFromOrderConfirmation = async (token) => {
    await this.setState({ token: token });
    await this.sendPayment(this.state.token);
  };

  // Call back function, received token from Header
  sendPayment = async (token) => {
    token = { ...token, amount: this.state.total };
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Header': '*',
      },
      body: JSON.stringify(token),
    };

    // sending the payment to stripe
    const res = await fetch('/api/stripe', requestOptions);
    const stripe = await res.json();
    if (res.status === 200) {
      // if payment was successful, start the backend orderID process
      this.generateOrder(stripe);
    } else {
      // Else, render an error. TODO: Fix this up later
      return <h1>There was a problem with the order.</h1>;
    }
  };

  setDeliveryInfo = async (newDelivery) => {
    await this.setState({
      deliveryToPersist: newDelivery,
    });
  };

  // Start the backend order procedure
  generateOrder = async (StripeResponse) => {
    const requestBody = {
      cart: this.state.cart,
      id: this.state.userInfo.id,
      totals: this.state.totalToPersist,
      StripeConfirmationID: StripeResponse.id,
      source: StripeResponse.source.brand,
      delivery: this.state.deliveryToPersist,
    };

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Header': '*',
      },
      // Sending the cart within the body of this post request in order to send the cart as Order History Items.
      body: JSON.stringify(requestBody),
    };

    // Fetch request to userRoutes.js which is used to generate an Order ID
    const response = await fetch(`/user/orders/${this.state.userInfo.id}`, requestOptions);

    if (response === 201) {
      // redirect to the order tracker component here
    }
  };

  render() {
    return (
      <>
        <Header
          userInfo={this.state.userInfo}
          isLoggedIn={this.state.isLoggedIn}
          total={this.state.total}
          cart={this.state.cart}
          receiveCartFromModal={this.receiveCartFromModal}
        />
        <Switch>
          <Route exact path="/user">
            <Userpage
              userInfo={this.state.userInfo}
              isLoggedIn={this.state.isLoggedIn}
              cart={this.state.cart}
              receiveUserInfoFromUserPage={this.receiveUserInfoFromUserPage}
            />
          </Route>
          <Route
            exact
            path="/order"
            render={() => (
              <OrderConfirmation
                userInfo={this.state.userInfo}
                isLoggedIn={this.state.isLoggedIn}
                cart={this.state.cart}
                address={this.state.userInfo.address}
                subTotal={this.state.total}
                updateCartQuantities={this.updateCartQuantities}
                sendPayment={this.sendPayment}
                token={this.state.token}
                receiveTokenFromOrderConfirmation={this.receiveTokenFromOrderConfirmation}
                receiveOCTotal={this.receiveOCTotal}
                getDelivery={this.setDeliveryInfo.bind(this)}
              />
            )}
          />
          <Route exact path="/orders">
            <UserOrderHistory userInfo={this.state.userInfo} />
          </Route>
          <Food receiveCart={this.receiveCart} updatedCart={this.state.cart} />
        </Switch>
        <Footer />
      </>
    );
  }
}

export default MainPage;
