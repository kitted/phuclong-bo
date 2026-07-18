/* eslint-disable react/prop-types */
import { Card, Grid } from "@mui/material";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftTypography from "components/SoftTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { Form, Formik } from "formik";
import React from "react";
import initialValues from "./schemas/initialValues";
import validations from "./schemas/validations";
import FormField from "./../../../components/FormField";
import form from "./schemas/form";
import { toast } from "react-toastify";
import { AuthService } from "services/authService";

export default function ChangePassword() {
  const { formId, formField } = form;

  const handleSubmit = async (values, action) => {
    try {
      await AuthService.changePassword(values);
      action.resetForm();
      action.setSubmitting(false);
      toast.success("Đổi mật khẩu thành công");
    } catch (error) {
      action.setSubmitting(false);
      toast.error(error?.response?.data?.message || "Đổi mật khẩu thất bại");
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox my={3}>
        <Card style={{ height: "100%" }}>
          <SoftBox pt={2} px={2} lineHeight={1}>
            <SoftTypography variant="h6" fontWeight="medium">
              Đổi mật khẩu
            </SoftTypography>
          </SoftBox>
          <Formik
            initialValues={initialValues}
            validationSchema={validations}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, isSubmitting, setFieldValue }) => (
              <Form id={formId} autoComplete="off">
                <SoftBox p={2}>
                  <Detail
                    formData={{
                      values,
                      touched,
                      formField,
                      errors,
                    }}
                  />
                  <SoftBox mt={2}>
                    <SoftButton
                      disabled={isSubmitting}
                      type="submit"
                      variant="gradient"
                      color="dark"
                    >
                      {isSubmitting ? "Đang gửi..." : "Gửi"}
                    </SoftButton>
                  </SoftBox>
                </SoftBox>
              </Form>
            )}
          </Formik>
        </Card>
      </SoftBox>
    </DashboardLayout>
  );
}

function Detail({ formData }) {
  const { formField, values, errors, touched } = formData;
  const { oldPassword, password, confirmPassword } = formField;
  const {
    oldPassword: oldPasswordV,
    password: passwordV,
    confirmPassword: confirmPasswordV,
  } = values;
  return (
    <Grid container spacing={3} mt={1}>
      <Grid item xs={12} style={{ paddingTop: 0 }}>
        <FormField
          type={oldPassword.type}
          name={oldPassword.name}
          label={oldPassword.label}
          value={oldPasswordV}
          error={errors.oldPassword && touched.oldPassword}
          success={oldPasswordV.length > 0 && !errors.oldPassword}
        />
      </Grid>
      <Grid item xs={12} style={{ paddingTop: 0 }}>
        <FormField
          type={password.type}
          name={password.name}
          label={password.label}
          value={passwordV}
          error={errors.password && touched.password}
          success={passwordV.length > 0 && !errors.confirmPassword}
        />
      </Grid>
      <Grid item xs={12} style={{ paddingTop: 0 }}>
        <FormField
          type={confirmPassword.type}
          name={confirmPassword.name}
          label={confirmPassword.label}
          value={confirmPasswordV}
          error={errors.confirmPassword && touched.password}
          success={confirmPasswordV.length > 0 && !errors.confirmPassword}
        />
      </Grid>
    </Grid>
  );
}
