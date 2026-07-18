/* eslint-disable react/prop-types */
import useAuthority from "hooks/useAuthority";
import { Navigate } from "react-router-dom";

const AuthorityGuard = (props) => {
  const { userAuthority = [], authority = [], children } = props;

  const roleMatched = useAuthority(userAuthority, authority);

  return <>{roleMatched ? children : <Navigate to="/access-denied" />}</>;
};

export default AuthorityGuard;
